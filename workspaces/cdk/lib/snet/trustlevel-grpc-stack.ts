import {Stack, SecretValue, Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  Protocol,
  AwsLogDriver,
  FargateService,
} from 'aws-cdk-lib/aws-ecs';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {PolicyStatement, Effect} from 'aws-cdk-lib/aws-iam';
import {IVpc, Port} from 'aws-cdk-lib/aws-ec2';
import {SnetVpc} from '../vpcs/snet-vpc-stack';
import {PrivateDnsNamespace} from 'aws-cdk-lib/aws-servicediscovery';

interface TrustlevelGrpcStackProps extends StagedStackProps {
  snetVpc: SnetVpc;
}

export class TrustlevelGrpcStack extends Stack {
  constructor(scope: Construct, id: string, props: TrustlevelGrpcStackProps) {
    super(scope, id, props);

    const stagePrefix = Stage[props.stage];
    const ecsCluster = this.createCluster(props.snetVpc.vpc, stagePrefix);
    const dnsNamespace = this.createNamespace(props.snetVpc.vpc, stagePrefix);
    const logGroup = this.createLogGroup(stagePrefix);
    const taskDefinition = this.createTaskDefinition(stagePrefix, logGroup);
    this.addContainerToTaskDefinition(taskDefinition, stagePrefix, logGroup);
    this.createFargateService(
      ecsCluster,
      taskDefinition,
      stagePrefix,
      props.snetVpc,
      dnsNamespace
    );
  }

  private createNamespace(vpc: IVpc, stagePrefix: string): PrivateDnsNamespace {
    // Create an ECS Cluster
    const dnsNamespace = new PrivateDnsNamespace(
      this,
      `${stagePrefix}-TrustlevelGrpcNamespace`,
      {
        name: `trustlevel-grpc-${stagePrefix}.local`,
        vpc,
      }
    );
    return dnsNamespace;
  }

  private createCluster(vpc: IVpc, stagePrefix: string): Cluster {
    // Create an ECS Cluster
    return new Cluster(this, `${stagePrefix}-TrustlevelGrpcCluster`, {
      vpc,
      clusterName: `${stagePrefix}-TrustlevelGrpcCluster`,
    });
  }

  private createLogGroup(stagePrefix: string): LogGroup {
    // Create a Log Group
    return new LogGroup(this, `TrustlevelGrpcLogGroup-${stagePrefix}`, {
      logGroupName: `/ecs/${stagePrefix}-trustlevel-grpc`,
    });
  }

  private createTaskDefinition(
    stagePrefix: string,
    logGroup: LogGroup
  ): FargateTaskDefinition {
    // Create an ECS Task Definition
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${stagePrefix}-TrustlevelGrpcTask`,
      {
        memoryLimitMiB: 1024,
        cpu: 512,
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

    return taskDefinition;
  }

  private addContainerToTaskDefinition(
    taskDefinition: FargateTaskDefinition,
    stagePrefix: string,
    logGroup: LogGroup
  ): void {
    const stageUrl = SecretValue.secretsManager(
      `trustlevel-api-url-${stagePrefix}`
    );
    const stageApiKey = SecretValue.secretsManager(
      `trustlevel-api-key-${stagePrefix}`
    );

    const repository = Repository.fromRepositoryName(
      this,
      `${stagePrefix}-TrustlevelGrpcRepository`,
      'trustlevel-grpc'
    );
    const container = taskDefinition.addContainer(
      `${stagePrefix}-TrustlevelGrpcContainer`,
      {
        image: ContainerImage.fromEcrRepository(repository),
        logging: new AwsLogDriver({
          logGroup: logGroup,
          streamPrefix: 'ecs',
        }),
        // TODO: add a real health check for the load balancer to work
        healthCheck: {
          command: ['CMD-SHELL', 'exit 0'],
          interval: Duration.seconds(30),
          timeout: Duration.seconds(5),
          retries: 3,
          startPeriod: Duration.seconds(60),
        },
        environment: {
          STAGE_URL: stageUrl.unsafeUnwrap(),
          STAGE_API_KEY: stageApiKey.unsafeUnwrap(),
          STAGE: stagePrefix, // Include this if you want to pass the stage as an environment variable
        },
      }
    );

    container.addPortMappings({
      containerPort: 7077,
      protocol: Protocol.TCP,
    });
  }

  private createFargateService(
    cluster: Cluster,
    taskDefinition: FargateTaskDefinition,
    stagePrefix: string,
    snetVpc: SnetVpc,
    dnsNamespace: PrivateDnsNamespace
  ): void {
    // Create a standard Fargate Service without an ALB
    const fargateService = new FargateService(
      this,
      `${stagePrefix}-TrustlevelGrpcFargateService`,
      {
        cluster,
        taskDefinition,
        serviceName: `${stagePrefix}-TrustlevelGrpcFargateService`,
        desiredCount: 1,
        vpcSubnets: {subnets: snetVpc.vpc.privateSubnets},
        securityGroups: [snetVpc.grpcSecurityGroup],
        assignPublicIp: false, // Set to true if you need public access
        cloudMapOptions: {
          cloudMapNamespace: dnsNamespace,
          name: `trustlevel-grpc-service-${stagePrefix}`,
        },
      }
    );
    fargateService.connections.allowFromAnyIpv4(Port.tcp(7077));
  }

  // private createFargateService(
  //   cluster: Cluster,
  //   taskDefinition: FargateTaskDefinition,
  //   stagePrefix: string,
  //   snetVpc: SnetVpc,
  //   dnsNamespace: PrivateDnsNamespace
  // ): void {
  //   // Create a Fargate Service with Application Load Balancer
  //   const fargateService = new ApplicationLoadBalancedFargateService(
  //     this,
  //     `${stagePrefix}-TrustlevelGrpcFargateService`,
  //     {
  //       cluster,
  //       serviceName: `${stagePrefix}-TrustlevelGrpcFargateService`,
  //       taskDefinition,
  //       publicLoadBalancer: false,
  //       cloudMapOptions: {
  //         cloudMapNamespace: dnsNamespace,
  //         name: `trustlevel-grpc-service-${stagePrefix}`,
  //       },
  //     }
  //   );

  //   // Open port 7077 for the Load Balancer
  //   fargateService.service.connections.allowFromAnyIpv4(Port.tcp(7077));
  //   fargateService.service.connections.addSecurityGroup(
  //     snetVpc.grpcSecurityGroup
  //   );
  // }
}
