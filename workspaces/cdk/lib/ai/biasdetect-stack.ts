import {App, Stack} from 'aws-cdk-lib';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  FargateService,
  Protocol,
  OperatingSystemFamily,
} from 'aws-cdk-lib/aws-ecs';
import {SubnetType} from 'aws-cdk-lib/aws-ec2';
import {PrivateDnsNamespace} from 'aws-cdk-lib/aws-servicediscovery';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';
import {AiVpc} from '../vpcs/ai-vpc-stack';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {
  AwsLogDriver,
  CpuArchitecture
} from 'aws-cdk-lib/aws-ecs';
import {PolicyStatement, Effect} from 'aws-cdk-lib/aws-iam';

interface BiasDetectStackProps extends StagedStackProps {
  aiVpc: AiVpc;
}

export class BiasDetectStack extends Stack {
  constructor(scope: App, id: string, props: BiasDetectStackProps) {
    super(scope, id, props);

    // Use the provided VPC
    const cluster = new Cluster(
      this,
      `${Stage[props!.stage]}-BiasDetectCluster`,
      {
        vpc: props.aiVpc.vpc,
        clusterName: `${Stage[props!.stage]}-BiasDetectCluster`,
      }
    );

    // ECR Repository
    const repository = Repository.fromRepositoryName(
      this,
      `${Stage[props!.stage]}-BiasDetectRepository`,
      'bias-d4data' // Name of the existing repository, created on the commandline
    );
    

    // Fargate Task Definition
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${Stage[props!.stage]}-BiasDetectTask`,
      {
        runtimePlatform: {
          operatingSystemFamily: OperatingSystemFamily.LINUX,
          cpuArchitecture: CpuArchitecture.ARM64,
        },
        memoryLimitMiB: 1024,
        cpu: 512,
      }
    );

    const logGroup = new LogGroup(
      this,
      `BiasDetectLogGroup-${Stage[props!.stage]}`,
      {
        logGroupName: `/ecs/${Stage[props!.stage]}-biasDetect`,
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
      `${Stage[props!.stage]}-BiasDetectContainer`,
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
      `${Stage[props!.stage]}-BiasDetectNamespace`,
      {
        name: `biasDetect-${Stage[props!.stage]}.local`,
        vpc: props.aiVpc.vpc,
      }
    );

    // Create Fargate Service with Cloud Map Service Discovery
    new FargateService(this, `${Stage[props!.stage]}-BiasDetectService`, {
      cluster,
      serviceName: `${Stage[props!.stage]}-BiasDetectService`,
      taskDefinition,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS, // Deploy in private subnet
      },
      securityGroups: [props.aiVpc.spacytextblobSecurityGroup],
      cloudMapOptions: {
        name: `biasDetect-service-${Stage[props!.stage]}`, // DNS name for the service in the private DNS namespace
        cloudMapNamespace: dnsNamespace,
      },
    });
  }
}
