import {App, Stack} from 'aws-cdk-lib';
import {Vpc, IVpc, SecurityGroup, Port} from 'aws-cdk-lib/aws-ec2';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';

export interface AiVpc {
  vpc: IVpc;
  spacytextblobSecurityGroup: SecurityGroup;
  lambdaSecurityGroup: SecurityGroup;
}

export class AiVpcStack extends Stack {
  public readonly aiVpc: AiVpc;

  constructor(scope: App, id: string, props?: StagedStackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, `${Stage[props!.stage]}-AiVpc`, {
      // VPC configuration (e.g., CIDR, subnets, etc.)
    });

    const spacytextblobSecurityGroup = new SecurityGroup(
      this,
      `${Stage[props!.stage]}-SpacytextblobSecurityGroup`,
      {
        vpc,
        // Define additional security group settings if needed
      }
    );

    const lambdaSecurityGroup = new SecurityGroup(
      this,
      `${Stage[props!.stage]}-TrustlevelPostLambdaSecurityGroup`,
      {
        vpc,
      }
    );

    lambdaSecurityGroup.addEgressRule(
      spacytextblobSecurityGroup,
      Port.tcp(5000),
      'Allow Lambda to access Spacytextblob on port 5000'
    );

    this.aiVpc = {
      vpc,
      spacytextblobSecurityGroup,
      lambdaSecurityGroup,
    };
  }
}
