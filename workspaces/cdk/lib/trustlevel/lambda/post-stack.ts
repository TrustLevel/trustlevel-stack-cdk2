
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stage } from '../../../bin/stages';
import { Architecture, AssetCode, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { StagedStackProps } from '../../../bin/stagedStackProps';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AiVpc } from '../../vpcs/ai-vpc-stack';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export interface TrustlevelPostStackProps extends StagedStackProps {
  aiVpc: AiVpc;
  allowedOrigins: string[];
}

export interface TrustlevelPostFunction {
  function: Function;
  allowedOrigins: string[];
}

export class TrustlevelPostStack extends cdk.Stack {
  public readonly trustlevelPostFunction: TrustlevelPostFunction;

  constructor(scope: Construct, id: string, props: TrustlevelPostStackProps) {
    super(scope, id, props);

    const allowedOrigins = props.allowedOrigins ? props.allowedOrigins : ['*'];

    const functionName = `${Stage[props!.stage]}-trustlevel-post`;

    const stage = Stage[props!.stage];

    // don't forget to create secret manually in Secrets Manager
    const openaiApiKey = cdk.SecretValue.secretsManager(
      `openai-api-key-${stage}`
    );

    const lambdaFunction = new PythonFunction(this, functionName, {
      functionName: functionName,
      entry: '../../workspaces/apis/content-score-api',
      runtime: Runtime.PYTHON_3_11,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(120),
      index: 'main.py',
      handler: 'handler',
      vpc: props.aiVpc.vpc,
      securityGroups: [props.aiVpc.lambdaSecurityGroup],
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS, // or as per your network design
      },
      environment: {
        ALLOWED_ORIGINS: JSON.stringify(allowedOrigins),
        DEFAULT_CONFIG: JSON.stringify({}),
        // NOTE: replace with more secure method:
        // https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html#arm64
        OPENAI_API_KEY: openaiApiKey.unsafeUnwrap(),
      },
    })

    this.trustlevelPostFunction = {
      function: lambdaFunction,
      allowedOrigins,
    };
  }
}
