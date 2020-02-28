#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { PipelineStack } from '../lib/pipeline-stack';

const appName = 'example-app';
const codeCommitRepoName = 'example-app';
const app = new cdk.App();

new PipelineStack(app, 'PipelineStackDev', {
    appName: appName,
    prodStage: false,
    cidr: '10.10.0.0/16',
    maxAzs: 3,
    codeCommitRepoName: codeCommitRepoName,
    gitBranch: 'develop',
    ecrRepoName: "dev-example-app",
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    prodManualApprovalStage: false,
});

new PipelineStack(app, 'PipelineStackProd', {
    appName: appName,
    prodStage: false,
    cidr: '10.20.0.0/16',
    maxAzs: 3,
    codeCommitRepoName: codeCommitRepoName,
    gitBranch: 'master',
    ecrRepoName: "prod-example-app",
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    prodManualApprovalStage: true,
    prodManualApprovalSnsEmail: [
        'who@example.com',
    ],
});
