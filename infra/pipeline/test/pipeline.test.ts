import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Pipeline = require('../lib/pipeline-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Pipeline.PipelineStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
