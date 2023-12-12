import {App, Stack} from 'aws-cdk-lib';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  FargateService,
  Protocol,
} from 'aws-cdk-lib/aws-ecs';
import {Port} from 'aws-cdk-lib/aws-ec2';
import {PrivateDnsNamespace} from 'aws-cdk-lib/aws-servicediscovery';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';
import {TrustlevelPostFunction} from '../trustlevel/lambda/post-stack';
import {AiVpc} from '../vpcs/ai-vpc-stack';

interface SpacytextblobStackProps extends StagedStackProps {
  aiVpc: AiVpc;
  trustlevelPostFn: TrustlevelPostFunction;
}

export class SpacytextblobStack extends Stack {
  constructor(scope: App, id: string, props: SpacytextblobStackProps) {
    super(scope, id, props);

    // Use the provided VPC
    const cluster = new Cluster(
      this,
      `${Stage[props!.stage]}-SpacytextblobCluster`,
      {
        vpc: props.aiVpc.vpc,
      }
    );

    // ECR Repository
    const repository = new Repository(
      this,
      `${Stage[props!.stage]}-SpacytextblobRepository`
    );

    // Fargate Task Definition
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${Stage[props!.stage]}-SpacytextblobTask`,
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );

    // Add Container
    const container = taskDefinition.addContainer(
      `${Stage[props!.stage]}-SpacytextblobContainer`,
      {
        image: ContainerImage.fromEcrRepository(repository),
        // additional container settings
      }
    );

    container.addPortMappings({
      containerPort: 5000, // The port your application is listening on
      protocol: Protocol.TCP,
    });

    // Create Private DNS Namespace for Service Discovery
    const dnsNamespace = new PrivateDnsNamespace(
      this,
      `${Stage[props!.stage]}-SpacytextblobNamespace`,
      {
        name: 'spacytextblob.local',
        vpc: props.aiVpc.vpc,
      }
    );

    // Create Fargate Service with Cloud Map Service Discovery
    const service = new FargateService(
      this,
      `${Stage[props!.stage]}-SpacytextblobService`,
      {
        cluster,
        taskDefinition,
        securityGroups: [props.aiVpc.spacytextblobSecurityGroup],
        cloudMapOptions: {
          name: `spacytextblob-service-${Stage[props!.stage]}`, // DNS name for the service in the private DNS namespace
          cloudMapNamespace: dnsNamespace,
        },
      }
    );

    service.connections.allowFrom(
      props.trustlevelPostFn.function,
      Port.tcp(5000)
    ); // Allow only Lambda function
  }
}
