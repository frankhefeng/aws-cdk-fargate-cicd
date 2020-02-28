import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Common = require('../lib/common-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Common.CommonStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
