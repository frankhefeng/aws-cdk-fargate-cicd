#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CommonStack } from '../lib/common-stack';

const appName = 'example-app';

const app = new cdk.App();
new CommonStack(app, 'CommonStack', {
    codeCommitRepoName: appName,
    devEcrRepo: 'dev-' + appName.split(/(?=[A-Z])/).join('_').toLowerCase(),
    prodEcrRepo: 'prod-' + appName.split(/(?=[A-Z])/).join('_').toLowerCase(),
});
