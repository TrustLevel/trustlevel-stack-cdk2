#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {exit} from 'process';
import {stageAppendix, stageByParam} from './stages';
import {AiVpcStack} from '../lib/vpcs/ai-vpc-stack';
import {SpacytextblobStack} from '../lib/ai/spacytextblob-stack';
import {trustlevelApi} from '../lib/trustlevel/trustlevel';
import {StagedStackProps} from './stagedStackProps';
import {SharedVpc} from '../lib/vpcs/shared-vpc-stack';
import {SnetdStack} from '../lib/snet/snetd-stack';
import {SnetVpcStack} from '../lib/vpcs/snet-vpc-stack';
import {TrustlevelGrpcStack} from '../lib/snet/trustlevel-grpc-stack';

const app = new cdk.App();

const stageParam = app.node.tryGetContext('stage');
if (!stageParam) {
  console.warn(
    'stageParam variable is missing... Add -c stage=dev for example'
  );

  exit();
}

const stage = stageByParam(stageParam);

const globalConfig = {
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  env: {account: '086829801639', region: 'eu-west-1'},
};

const stagedProps: StagedStackProps = {
  ...globalConfig,
  stage,
};

// yarn cdk deploy SharedVpc -c stage=dev // stage here is only there to not exit the program in the beginning
new SharedVpc(app, 'SharedVpc', {});

// yarn cdk deploy AiVpcStack-dev -c stage=dev
// yarn cdk deploy AiVpcStack-prd -c stage=prd
const aiVpcStack = new AiVpcStack(app, `AiVpcStack${stageAppendix(stage)}`, {
  ...stagedProps,
});

// yarn cdk deploy TrustlevelGatewayStack-dev -c stage=dev
// yarn cdk deploy TrustlevelGatewayStack-prd -c stage=prd
trustlevelApi(app, stagedProps, aiVpcStack.aiVpc);

// yarn cdk deploy SpacytextblobStack-dev -c stage=dev
// yarn cdk deploy SpacytextblobStack-prd -c stage=prd
new SpacytextblobStack(app, `SpacytextblobStack${stageAppendix(stage)}`, {
  ...stagedProps,
  aiVpc: aiVpcStack.aiVpc,
});

// yarn cdk deploy SnetVpcStack-dev -c stage=dev
const snetVpcStack = new SnetVpcStack(
  app,
  `SnetVpcStack${stageAppendix(stage)}`,
  {
    ...stagedProps,
  }
);

// yarn cdk deploy TrustlevelGrpcStack-dev -c stage=dev
new TrustlevelGrpcStack(app, `TrustlevelGrpcStack${stageAppendix(stage)}`, {
  ...stagedProps,
  snetVpc: snetVpcStack.snetVpc,
});

// yarn cdk deploy SnetdStack-dev -c stage=dev
// yarn cdk deploy SnetdStack-prd -c stage=prd
new SnetdStack(app, `SnetdStack${stageAppendix(stage)}`, {
  ...stagedProps,
  snetVpc: snetVpcStack.snetVpc,
});
