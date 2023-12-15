import * as cdk from 'aws-cdk-lib';
import {stageAppendix} from '../../bin/stages';
import {TrustlevelPostFunction, TrustlevelPostStack} from './lambda/post-stack';
import {TrustlevelGatewayStack} from './api/trustlevel-gateway';
import {AiVpc} from '../vpcs/ai-vpc-stack';
import {StagedStackProps} from '../../bin/stagedStackProps';

export const trustlevelApi = (
  app: cdk.App,
  stagedProps: StagedStackProps,
  aiVpc: AiVpc
): TrustlevelPostFunction => {
  const localhosts = ['http://localhost:8080'];
  const ALLOWED_ORIGINS = [...localhosts];

  const trustlevelPost = new TrustlevelPostStack(
    app,
    `TrustlevelPostStack${stageAppendix(stagedProps.stage)}`,
    {
      ...stagedProps,
      allowedOrigins: ALLOWED_ORIGINS,
      aiVpc,
    }
  );

  new TrustlevelGatewayStack(
    app,
    `TrustlevelGatewayStack${stageAppendix(stagedProps.stage)}`,
    {
      ...stagedProps,
      trustlevelPostFn: trustlevelPost.trustlevelPostFunction,
    }
  );

  return trustlevelPost.trustlevelPostFunction;
};
