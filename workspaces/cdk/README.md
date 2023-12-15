# Welcome to the Trustlevel CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Execution

### Prerequisites

1. Make sure `node` and `npm` is installed on your computer
1. Configure a `trustlevel` `AWS_PROFILE` in your global ~/.aws/credentials and ~/.aws/config files.

### Commands

Considering Prerequisites, you should be able to execute deployment scripts now:

```bash
# Deploy a stack with the name <YOU_NAME_IT_Stack>-dev in your dev stage
yarn cdk deploy <YOU_NAME_IT_Stack>-dev -c stage=dev
```

## Trustlevel api details deployment

```bash
# Make sure to use the correct profile
export AWS_PROFILE=trustlevel

# Deploy the secret (prd stage in this example)
aws secretsmanager create-secret --name trustlevel-api-key-prd --secret-string "${TRUSTLEVEL_API_KEY}" --region eu-west-1

AWS_PROFILE=trustlevel aws secretsmanager create-secret --name trustlevel-api-url-dev --secret-string https://2q2ffhhelb.execute-api.eu-west-1.amazonaws.com/v1 --region eu-west-1

AWS_PROFILE=trustlevel aws secretsmanager create-secret --name trustlevel-api-url-prd --secret-string https://powr86cuh9.execute-api.eu-west-1.amazonaws.com/v1 --region eu-west-1
```

## Useful commands

* `yarn build`   compile typescript to js
* `yarn watch`   watch for changes and compile
* `yarn test`    perform the jest unit tests
* `yarn cdk deploy`      deploy this stack to your configured AWS account/region
* `yarn cdk diff`        compare deployed stack with current state
* `yarn cdk synth`       emits the synthesized CloudFormation template
