import {App, Stack} from 'aws-cdk-lib';
import {IVpc, SecurityGroup, Port, Peer, Vpc} from 'aws-cdk-lib/aws-ec2';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';

export interface SnetVpc {
  vpc: IVpc;
  // snetdSecurityGroup: SecurityGroup;
  grpcSecurityGroup: SecurityGroup;
}

export class SnetVpcStack extends Stack {
  public readonly snetVpc: SnetVpc;

  constructor(scope: App, id: string, props?: StagedStackProps) {
    super(scope, id, props);

    const sharedVpcId = 'vpc-0945f749192a4f18d';
    const existingVpc = Vpc.fromLookup(this, 'ImportedVpcForSnet', {
      vpcId: sharedVpcId,
    });

    // const snetdSecurityGroup = new SecurityGroup(
    //   this,
    //   `${Stage[props!.stage]}-SnetdSecurityGroup`,
    //   {
    //     vpc: existingVpc,
    //     allowAllOutbound: true,
    //   }
    // );

    // snetdSecurityGroup.addIngressRule(
    //   Peer.anyIpv4(),
    //   Port.tcp(7001),
    //   'Allow public access on port 7001'
    // );

    const grpcSecurityGroup = new SecurityGroup(
      this,
      `${Stage[props!.stage]}-GrpcSecurityGroup`,
      {
        vpc: existingVpc,
        allowAllOutbound: true,
      }
    );

    // Allow Snetd service to access TrustlevelGrpc service
    // grpcSecurityGroup.addIngressRule(
    //   snetdSecurityGroup, // Replace with the actual security group of Snetd service
    //   Port.tcp(7077),
    //   'Allow inbound TCP from Snetd service'
    // );

    // Allow all inbound traffic for testing
    grpcSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.allTraffic(),
      'Allow all inbound traffic for testing'
    );

    this.snetVpc = {
      vpc: existingVpc,
      // snetdSecurityGroup,
      grpcSecurityGroup,
    };
  }
}
