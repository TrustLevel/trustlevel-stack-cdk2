import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import {Construct} from 'constructs';
import {Stage} from '../../../bin/stages';
import {StagedStackProps} from '../../../bin/stagedStackProps';
import {TrustlevelPostFunction} from '../lambda/post-stack';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface TrustlevelGatewayStackProps extends StagedStackProps {
  trustlevelPostFn: TrustlevelPostFunction; // Ensure this type is correctly imported or defined
}

export class TrustlevelGatewayStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TrustlevelGatewayStackProps
  ) {
    super(scope, id, props);

    // enable access logging 
    const apiLogGroup = new LogGroup(this, `${Stage[props.stage]}-TrustlevelApi-LogGroup`, {
      retention: RetentionDays.ONE_MONTH,
      logGroupName: `/apigateway/${Stage[props.stage]}-TrustlevelApi`
    })
    apiLogGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // API Gateway REST API setup
    const api = new apigateway.RestApi(this, `${Stage[props.stage]}-TrustlevelApi`, {
      endpointConfiguration: {types: [apigateway.EndpointType.EDGE]},
      // required to enable access logging
      cloudWatchRole: true,
      deployOptions: {
        stageName: 'v1',
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),

        // generates log group named: 'API-Gateway-Execution-Logs_<api-id>/<stage>' if enabled
        // disable on production
        loggingLevel: props.stage == Stage.dev ? apigateway.MethodLoggingLevel.ERROR : apigateway.MethodLoggingLevel.OFF
      },
    });

    // Gateway Response for handling CORS with 4xx errors
    api.addGatewayResponse(`${Stage[props.stage]}-TrustlevelGatewayResponse`, {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    // Trustlevels resource and method
    const trustlevelsResource = api.root.addResource('trustlevels');
    trustlevelsResource.addCorsPreflight({
      allowOrigins: props.trustlevelPostFn.allowedOrigins,
      allowMethods: ['POST'],
    });

    const postIntegration = new apigateway.LambdaIntegration(
      props.trustlevelPostFn.function
    );
    trustlevelsResource.addMethod('POST', postIntegration, {
      apiKeyRequired: true,
    });

    // API Key and Usage Plan
    const apiKeyValue = cdk.SecretValue.secretsManager(
      `trustlevel-api-key-${Stage[props.stage]}`
    );

    const apiKey = new apigateway.ApiKey(this, `ApiKey-${Stage[props.stage]}`, {
      apiKeyName: `${Stage[props.stage]}-TrustlevelApiKey}`,
      value: apiKeyValue.unsafeUnwrap(),
      enabled: true,
    });

    // Usage Plan
    const usagePlan = new apigateway.UsagePlan(this, `${Stage[props.stage]}-UsagePlan`, {
      name: `${Stage[props.stage]}-TrustlevelUsagePlan`,
      throttle:
        props.stage === Stage.prd
          ? {rateLimit: 100, burstLimit: 20}
          : {rateLimit: 10, burstLimit: 5},
    });

    usagePlan.addApiKey(apiKey);

    usagePlan.addApiStage({
      stage: api.deploymentStage,
      api: api,
    });
  }
}
