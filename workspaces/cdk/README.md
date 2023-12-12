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

## Useful commands

* `yarn build`   compile typescript to js
* `yarn watch`   watch for changes and compile
* `yarn test`    perform the jest unit tests
* `yarn cdk deploy`      deploy this stack to your configured AWS account/region
* `yarn cdk diff`        compare deployed stack with current state
* `yarn cdk synth`       emits the synthesized CloudFormation template