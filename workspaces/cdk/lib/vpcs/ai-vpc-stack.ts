import {App, Stack} from 'aws-cdk-lib';
import {IVpc, SecurityGroup, Port, Peer, Vpc} from 'aws-cdk-lib/aws-ec2';
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

    const sharedVpcId = 'vpc-0945f749192a4f18d';
    const existingVpc = Vpc.fromLookup(this, 'ImportedVpc', {
      vpcId: sharedVpcId,
    });

    const spacytextblobSecurityGroup = new SecurityGroup(
      this,
      `${Stage[props!.stage]}-SpacytextblobSecurityGroup`,
      {
        vpc: existingVpc,
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
        vpc: existingVpc,
        allowAllOutbound: false,
      }
    );

    lambdaSecurityGroup.addEgressRule(
      spacytextblobSecurityGroup,
      Port.tcp(5000),
      'Allow Lambda to access Spacytextblob on port 5000'
    );

    lambdaSecurityGroup.addEgressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow internet access on port 443 for OpenAI'
    );

    spacytextblobSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      Port.tcp(5000),
      'Allow inbound from Lambda'
    );

    this.aiVpc = {
      vpc: existingVpc,
      spacytextblobSecurityGroup,
      lambdaSecurityGroup,
    };
  }
}
