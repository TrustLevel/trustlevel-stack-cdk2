import {Stack, SecretValue} from 'aws-cdk-lib';
import {
  RestApi,
  EndpointType,
  LambdaIntegration,
  ResponseType,
  ApiKey,
  UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';
import {Construct} from 'constructs';
import {Stage} from '../../../bin/stages';
import {StagedStackProps} from '../../../bin/stagedStackProps';
import {TrustlevelPostFunction} from '../lambda/post-stack';

export interface TrustlevelGatewayStackProps extends StagedStackProps {
  trustlevelPostFn: TrustlevelPostFunction; // Ensure this type is correctly imported or defined
}

export class TrustlevelGatewayStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TrustlevelGatewayStackProps
  ) {
    super(scope, id, props);

    // API Gateway REST API setup
    const api = new RestApi(this, `${Stage[props.stage]}-TrustlevelApi`, {
      endpointConfiguration: {types: [EndpointType.EDGE]},
      deployOptions: {stageName: 'v1'},
    });

    // Gateway Response for handling CORS with 4xx errors
    api.addGatewayResponse(`${Stage[props.stage]}-TrustlevelGatewayResponse`, {
      type: ResponseType.DEFAULT_4XX,
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

    const postIntegration = new LambdaIntegration(
      props.trustlevelPostFn.function
    );
    trustlevelsResource.addMethod('POST', postIntegration, {
      apiKeyRequired: true,
    });

    // API Key and Usage Plan
    const apiKeyValue = SecretValue.secretsManager(
      `trustlevel-api-key-${Stage[props.stage]}`
    );

    const apiKey = new ApiKey(this, `ApiKey-${Stage[props.stage]}`, {
      apiKeyName: `${Stage[props.stage]}-TrustlevelApiKey}`,
      value: apiKeyValue.unsafeUnwrap(),
      enabled: true,
    });

    // Usage Plan
    const usagePlan = new UsagePlan(this, `${Stage[props.stage]}-UsagePlan`, {
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
