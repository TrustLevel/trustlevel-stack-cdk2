#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {exit} from 'process';
import {stageAppendix, stageByParam} from './stages';
import {AiVpcStack} from '../lib/vpcs/ai-vpc-stack';
import {SpacytextblobStack} from '../lib/ai/spacytextblob-stack';

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

const aiVpcStack = new AiVpcStack(app, `AiVpcStack${stageAppendix(stage)}`, {
  ...globalConfig,
  stage,
});

new SpacytextblobStack(app, `SpacytextblobStack${stageAppendix(stage)}`, {
  ...globalConfig,
  stage,
  vpc: aiVpcStack.vpc,
});
