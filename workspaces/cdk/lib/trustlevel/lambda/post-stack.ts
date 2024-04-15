import {Stack, Duration, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Stage} from '../../../bin/stages';
import {Architecture, AssetCode, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {StagedStackProps} from '../../../bin/stagedStackProps';
import {SubnetType} from 'aws-cdk-lib/aws-ec2';
import {AiVpc} from '../../vpcs/ai-vpc-stack';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export interface TrustlevelPostStackProps extends StagedStackProps {
  aiVpc: AiVpc;
  allowedOrigins: string[];
}

export interface TrustlevelPostFunction {
  function: Function;
  allowedOrigins: string[];
}

export class TrustlevelPostStack extends Stack {
  public readonly trustlevelPostFunction: TrustlevelPostFunction;

  constructor(scope: Construct, id: string, props: TrustlevelPostStackProps) {
    super(scope, id, props);

    const allowedOrigins = props.allowedOrigins ? props.allowedOrigins : ['*'];

    const functionName = `${Stage[props!.stage]}-trustlevel-post`;

    const stage = Stage[props!.stage];

    const pythonFunctionName = `${functionName}-python`
    new PythonFunction(this, pythonFunctionName, {
      functionName: pythonFunctionName,
      entry: '../../workspaces/apis/content-score-api',
      runtime: Runtime.PYTHON_3_11,
      architecture: Architecture.ARM_64,
      index: 'main.py',
      handler: 'handler',
    })

    const lambdaFunction = new Function(this, functionName, {
      functionName,
      handler: 'index.handler',
      timeout: Duration.seconds(120),
      runtime: Runtime.NODEJS_18_X,
      currentVersionOptions: {removalPolicy: RemovalPolicy.RETAIN},
      code: AssetCode.fromAsset(
        '../../workspaces/apis/trustlevel-api/dist/bundle',
        {
          exclude: ['**', '!index.js'],
        }
      ),
      vpc: props.aiVpc.vpc,
      securityGroups: [props.aiVpc.lambdaSecurityGroup],
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS, // or as per your network design
      },
      environment: {
        ALLOWED_ORIGINS: JSON.stringify(allowedOrigins),
        SPACYTEXTBLOB_URL: `http://spacytextblob-service-${stage}.spacytextblob-${stage}.local:5000`, // Use the actual Service Discovery DNS name
        BIASD4DATA_URL: `http://biasDetect-service-${stage}.biasDetect-${stage}.local:5000`, // Use the actual Service Discovery DNS name
        DEFAULT_WEIGHTS: JSON.stringify({
          approach: 'individual',
          polarity: {
            model: 'spacytextblob',
            weight: 1.0,
            scaling: 1.0,
            steepness: 5.0,
            shift: 0.1,
          },
          objectivity: {
            model: 'spacytextblob',
            weight: 1.0,
            scaling: 1.0,
            steepness: 5.0,
            shift: 0.1,
          },
          bias: {
            model: 'openai/gpt-3.5-bias-v1',
            weight: 1.0,
            scaling: 1.0,
            steepness: 5.0,
            shift: 0.1,
          },
        })
      },
    });

    this.trustlevelPostFunction = {
      function: lambdaFunction,
      allowedOrigins,
    };
  }
}
