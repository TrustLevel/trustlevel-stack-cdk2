import {App, Stack} from 'aws-cdk-lib';
import {Vpc, IVpc, SecurityGroup, Port, Peer} from 'aws-cdk-lib/aws-ec2';
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
      maxAzs: 3, // Define the maximum number of Availability Zones to use
    });

    const spacytextblobSecurityGroup = new SecurityGroup(
      this,
      `${Stage[props!.stage]}-SpacytextblobSecurityGroup`,
      {
        vpc,
        allowAllOutbound: false,
      }
    );

    spacytextblobSecurityGroup.addEgressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow outbound HTTPS traffic to ECR'
    );

    const lambdaSecurityGroup = new SecurityGroup(
      this,
      `${Stage[props!.stage]}-TrustlevelPostLambdaSecurityGroup`,
      {
        vpc,
        allowAllOutbound: false,
      }
    );

    lambdaSecurityGroup.addEgressRule(
      spacytextblobSecurityGroup,
      Port.tcp(5000),
      'Allow Lambda to access Spacytextblob on port 5000'
    );

    spacytextblobSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      Port.tcp(5000),
      'Allow inbound from Lambda'
    );

    this.aiVpc = {
      vpc,
      spacytextblobSecurityGroup,
      lambdaSecurityGroup,
    };
  }
}
