#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {exit} from 'process';

const app = new cdk.App();

const stageParam = app.node.tryGetContext('stage');
if (!stageParam) {
  console.warn(
    'stageParam variable is missing... Add -c stage=dev for example'
  );
  exit();
}

const globalConfig = {
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  env: {account: '086829801639', region: 'eu-west-1'},
};
