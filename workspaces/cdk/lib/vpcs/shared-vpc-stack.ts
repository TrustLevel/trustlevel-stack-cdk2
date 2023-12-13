import {App, CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Vpc} from 'aws-cdk-lib/aws-ec2';

export class SharedVpc extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create the VPC in the context of this stack
    const vpc = new Vpc(this, 'TrustlevelVpc', {
      // Use 'this' instead of 'scope'
      maxAzs: 3,
    });

    new CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
    });
  }
}
