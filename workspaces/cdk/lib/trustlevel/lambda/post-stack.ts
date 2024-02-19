import {Stack, Duration, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Stage} from '../../../bin/stages';
import {AssetCode, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {StagedStackProps} from '../../../bin/stagedStackProps';
import {SubnetType} from 'aws-cdk-lib/aws-ec2';
import {AiVpc} from '../../vpcs/ai-vpc-stack';

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
          polarity: 1.0,
          subjectivity: 1.0,
          bias: 1.0,
        })
      },
    });

    this.trustlevelPostFunction = {
      function: lambdaFunction,
      allowedOrigins,
    };
  }
}
