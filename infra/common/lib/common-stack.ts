import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');

export interface CommonStackProps extends cdk.StackProps {
  codeCommitRepoName: string;
  devEcrRepo: string,
  prodEcrRepo: string,
}

export class CommonStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const repo = new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: props.codeCommitRepoName
    })

    const devEcrRepo = new ecr.Repository(this, 'DevEcrRepo', { repositoryName: props.devEcrRepo });
    const prodEcrRepo = new ecr.Repository(this, 'ProdEcrRepo', { repositoryName: props.prodEcrRepo });

    new cdk.CfnOutput(this, 'CodeCommitRepoArn', { value: `${repo.repositoryArn}` })
    new cdk.CfnOutput(this, 'CodeCommitRepoUrl', { value: `${repo.repositoryCloneUrlSsh}` })

    new cdk.CfnOutput(this, 'DevEcrRepoUrl', { value: `${devEcrRepo.repositoryUri}` })
    new cdk.CfnOutput(this, 'ProdEcrRepoUrl', { value: `${prodEcrRepo.repositoryUri}` })
  }
}
