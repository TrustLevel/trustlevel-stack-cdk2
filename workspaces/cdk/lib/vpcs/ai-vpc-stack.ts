import {App, Stack} from 'aws-cdk-lib';
import {Vpc, IVpc} from 'aws-cdk-lib/aws-ec2';
import {StagedStackProps} from '../../bin/stagedStackProps';

export class AiVpcStack extends Stack {
  public readonly vpc: IVpc;

  constructor(scope: App, id: string, props?: StagedStackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, 'AiVpc', {
      // VPC configuration (e.g., CIDR, subnets, etc.)
    });
  }
}
