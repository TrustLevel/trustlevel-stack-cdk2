import {App, Stack} from 'aws-cdk-lib';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  FargateService,
  Protocol,
} from 'aws-cdk-lib/aws-ecs';
import {SubnetType} from 'aws-cdk-lib/aws-ec2';
import {PrivateDnsNamespace} from 'aws-cdk-lib/aws-servicediscovery';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';
import {AiVpc} from '../vpcs/ai-vpc-stack';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {AwsLogDriver} from 'aws-cdk-lib/aws-ecs';
import {PolicyStatement, Effect} from 'aws-cdk-lib/aws-iam';

interface SpacytextblobStackProps extends StagedStackProps {
  aiVpc: AiVpc;
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
        clusterName: `${Stage[props!.stage]}-SpacytextblobCluster`,
      }
    );

    // ECR Repository
    const repository = Repository.fromRepositoryName(
      this,
      `${Stage[props!.stage]}-SpacytextblobRepository`,
      'spacytextblob' // Name of the existing repository, created on the commandline
    );

    // Fargate Task Definition
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${Stage[props!.stage]}-SpacytextblobTask`,
      {
        memoryLimitMiB: 1024,
        cpu: 512,
      }
    );

    const logGroup = new LogGroup(
      this,
      `SpacytextblobLogGroup-${Stage[props!.stage]}`,
      {
        logGroupName: `/ecs/${Stage[props!.stage]}-spacytextblob`,
        // other optional configurations like retention policy
      }
    );

    const loggingPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      resources: [logGroup.logGroupArn],
    });

    taskDefinition.taskRole.addToPrincipalPolicy(loggingPolicy);

    // Add Container
    const container = taskDefinition.addContainer(
      `${Stage[props!.stage]}-SpacytextblobContainer`,
      {
        image: ContainerImage.fromEcrRepository(repository),
        logging: new AwsLogDriver({
          logGroup: logGroup,
          streamPrefix: 'ecs',
        }),
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
        name: `spacytextblob-${Stage[props!.stage]}.local`,
        vpc: props.aiVpc.vpc,
      }
    );

    // Create Fargate Service with Cloud Map Service Discovery
    new FargateService(this, `${Stage[props!.stage]}-SpacytextblobService`, {
      cluster,
      serviceName: `${Stage[props!.stage]}-SpacytextblobService`,
      taskDefinition,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS, // Deploy in private subnet
      },
      securityGroups: [props.aiVpc.spacytextblobSecurityGroup],
      cloudMapOptions: {
        name: `spacytextblob-service-${Stage[props!.stage]}`, // DNS name for the service in the private DNS namespace
        cloudMapNamespace: dnsNamespace,
      },
    });
  }
}
