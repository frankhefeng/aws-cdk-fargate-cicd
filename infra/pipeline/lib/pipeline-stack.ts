import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ec2 = require('@aws-cdk/aws-ec2');
import ecr = require('@aws-cdk/aws-ecr');
import ecs = require('@aws-cdk/aws-ecs');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import * as logs from '@aws-cdk/aws-logs';
import sns = require('@aws-cdk/aws-sns');
import { AppResource } from './app-resource';

export interface PipelineStackProps extends cdk.StackProps {
  appName: string;
  prodStage: boolean;
  cidr: string;
  maxAzs: number;
  codeCommitRepoName: string;
  gitBranch: string;
  ecrRepoName: string;
  prodManualApprovalStage?: boolean,
  prodManualApprovalSnsEmail?: string[],
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const stackPrefix = (props.prodStage ? 'prod' : 'dev') + '-' + props.appName;
    const removalPolicy = props.prodStage ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY

    var vpc = null
    if (props.prodStage) {
      //Use NAT Gateway by CDK default in production env
      vpc = new ec2.Vpc(this, 'vpc', {
        maxAzs: props.maxAzs,
        cidr: props.cidr,
      })
    } else {
      //Use NAT instances in development env to save costs
      const natGatewayProvider = ec2.NatProvider.instance({
        instanceType: new ec2.InstanceType('t3.micro')
      });
      vpc = new ec2.Vpc(this, 'vpc', {
        maxAzs: props.maxAzs,
        cidr: props.cidr,
        natGatewayProvider,
        natGateways: 2,
      })
    }

    const cluster = new ecs.Cluster(this, 'cluster', {
      vpc: vpc
    })

    const appResource = new AppResource(this, 'AppResource', {
      appName: props.appName,
      prodStage: props.prodStage,
      stackPrefix: stackPrefix,
      removalPolicy: removalPolicy,
    })

    const codeCommitRepo = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepo', props.codeCommitRepoName);
    const ecrRepo = ecr.Repository.fromRepositoryName(this, 'EcrRepo', props.ecrRepoName)
    const fargateLogGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: stackPrefix + 'Fargate',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: removalPolicy
    });

    const pipeline = new codepipeline.Pipeline(this, stackPrefix + 'Pipeline');

    //get latest source code from CodeCommit develop/master branch
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository: codeCommitRepo,
      branch: props.gitBranch,
      output: sourceOutput
    });
    const sourceStage = pipeline.addStage({
      stageName: 'Source'
    });
    sourceStage.addAction(sourceAction);

    //build docker image from source then push it to ECR
    const fargateBuildProject = new codebuild.PipelineProject(this, "Build", {
      description: "Build project for the Fargate pipeline",
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            'runtime-versions': {
              "golang": 1.13
            }
          },
          pre_build: {
            commands: [
              "echo Logging in to Amazon ECR...",
              "$(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)",
              "IMAGE_TAG=latest"
            ]
          },
          build: {
            commands: [
              "echo Build started on`date`",
              "echo Build the Docker image",
              "cd app/src",
              "make",
              "cd ..",
              "docker build -t $REPOSITORY_NAME:$IMAGE_TAG .",
              "docker tag $REPOSITORY_NAME:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG"
            ]
          },
          post_build: {
            commands: [
              "echo Build completed on`date`",
              "echo Pushing the Docker image...",
              "docker push $REPOSITORY_URI:$IMAGE_TAG",
              "printf '[{\"name\":\"web\",\"imageUri\":\"%s\"}]' $REPOSITORY_URI:$IMAGE_TAG > ../imagedefinitions.json",
            ]
          }
        },
        artifacts: {
          files: 'imagedefinitions.json',
        }
      }),
      environmentVariables: {
        'REPOSITORY_NAME': {
          value: ecrRepo.repositoryName,
        },
        'REPOSITORY_URI': {
          value: ecrRepo.repositoryUri,
        },
      }
    });
    ecrRepo.grantPullPush(fargateBuildProject);

    const fargateBuildOutput = new codepipeline.Artifact("fargateBuildOutput");
    const buildStage = pipeline.addStage({
      stageName: 'Build'
    });
    buildStage.addAction(new codepipeline_actions.CodeBuildAction({
      actionName: 'DockerBuild',
      project: fargateBuildProject,
      input: sourceOutput,
      outputs: [fargateBuildOutput],
    }));

    //extra approval stage for prod env
    if (props.prodStage) {
      const approveStage = pipeline.addStage({
        stageName: 'ManualApproval'
      });
      const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
        actionName: 'Approve',
        notificationTopic: new sns.Topic(this, props.appName + ' deployment manual approval'),
        notifyEmails: props.prodManualApprovalSnsEmail,
        // additionalInformation: 'additional info', // optional
      });
      approveStage.addAction(manualApprovalAction);
    }

    //deploy latest ECR image to Fargate
    const deployStage = pipeline.addStage({
      stageName: 'Deploy'
    });


    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(ecrRepo),
        enableLogging: true,
        logDriver: new ecs.AwsLogDriver({
          streamPrefix: stackPrefix,
          logGroup: fargateLogGroup,
        }),
        taskRole: appResource.taskRole,
        environment: {
          STAGE: (props.prodStage ? 'prod' : 'dev'),
          GIN_MODE: "release",
        },
        containerPort: 8080,
      },
      memoryLimitMiB: 512,
      cpu: 256,
      desiredCount: 5,
      publicLoadBalancer: true
    });

    deployStage.addAction(new codepipeline_actions.EcsDeployAction({
      actionName: 'ECSDeploy',
      service: fargateService.service,
      input: fargateBuildOutput,
    }))
  }
}
