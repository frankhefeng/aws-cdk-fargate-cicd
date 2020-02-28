# AWS CDK implementation of CI/CD pipeline for Go Gin Webapp on Fargate
This project builds a Go Gin Web application on Amazon Fargate with development and production environments and CI/CD pipeline with AWS CDK TypeScript.


## How to use
1. Configure AWS CLI as per instruction [Installing the AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
2. Configure AWS CDK  **TypeScript** environment as per instruction [Getting Started With the AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
3. Configure AWS CodeCommit  **Credentials**  as per instruction [Configure Credentials on Linux, macOS, or Unix](https://docs.aws.amazon.com/zh_cn/codecommit/latest/userguide/setting-up-ssh-unixes.html#setting-up-ssh-unixes-keys)
4. Go to `infra/common` folder, run `npm run build` to compile the scripts, then run `cdk deploy` to create resources below:
- one **CodeCommit Repository** shared by dev/prod envionments
- two **ECR Repositories** for dev/prod envionments each

Output of `cdk deploy`:
```
CommonStack.DevEcrRepoUrl = 888888888888.dkr.ecr.us-east-1.amazonaws.com/dev-example-app
CommonStack.ProdEcrRepoUrl = 666666666666.dkr.ecr.us-east-1.amazonaws.com/prod-example-app
CommonStack.CodeCommitRepoArn = arn:aws:codecommit:us-east-1:888888888888:example-app
CommonStack.CodeCommitRepoUrl = ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/example-app
```

5. In source code, switch to git `develop` branch,  add new created CodeCommit repo to git remote `git remote add codecommit <CommonStack.CodeCommitRepoUrl>`, then run `git push codecommit` to push all source code to CodeCommit.  
6. In source code, git `develop` branch,  switch to `app/src` folder, and run `make` to compile Go source code to binary. Then switch to `app` folder, prepare to build Docker image and push to ECR. This is only necessary for first deployment of CodePipeline. 
7. In AWS console, Go to ECR service, and find new created `dev-example-app` repository, then click `View push commands` button, execute all commands under folder `app`. 
8. Go to `infra/pipeline` folder, run `npm run build` to compile the scripts, then run `cdk deploy PipelineStackDev`. This will create CI/CD pipeline for develop environment.
9.  In source code, switch to git `master` branch, repeat steps 5~8, but replace all `dev` to `prod` to create CI/CD pipeline for production  environment. There is an extra manual approval stage in production pipeline, p

## Workflow
1. Develop features under git `develop` branch.  Create necessary AWS resources such as DynamoDB, RDS, in `app-resource.ts`, push code to CodeCommit, then CodePipeline will deploy latest source code automatically.
2. Merge tested source code to `master` branch and push code to CodeCommit, CodePipeline will build latest ECR image and deploy it after manually approval.



