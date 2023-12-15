import {Duration, Stack, RemovalPolicy} from 'aws-cdk-lib';
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
import {
  PolicyStatement,
  Effect,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import {Bucket} from 'aws-cdk-lib/aws-s3';
import {IVpc} from 'aws-cdk-lib/aws-ec2';
import {SnetVpc} from '../vpcs/snet-vpc-stack';

interface SnetdStackProps extends StagedStackProps {
  snetVpc: SnetVpc;
}

export class SnetdStack extends Stack {
  constructor(scope: Construct, id: string, props: SnetdStackProps) {
    super(scope, id, props);

    const stagePrefix = Stage[props.stage];
    const ecsCluster = this.createCluster(props.snetVpc.vpc, stagePrefix);
    const configBucket = this.createConfigBucket(stagePrefix);
    const taskRole = this.createTaskRole(stagePrefix, configBucket);
    const logGroup = this.createLogGroup(stagePrefix);
    const taskDefinition = this.createTaskDefinition(
      stagePrefix,
      taskRole,
      configBucket,
      logGroup
    );
    this.addContainerToTaskDefinition(taskDefinition, stagePrefix, logGroup);
    this.createFargateService(
      ecsCluster,
      taskDefinition,
      stagePrefix,
      props.snetVpc
    );
  }

  private createCluster(vpc: IVpc, stagePrefix: string): Cluster {
    // Create an ECS Cluster
    return new Cluster(this, `${stagePrefix}-SnetdCluster`, {
      vpc,
      clusterName: `${stagePrefix}-SnetdCluster`,
    });
  }

  private createConfigBucket(stagePrefix: string): Bucket {
    // Create a new S3 Bucket for the configuration file
    return new Bucket(this, `${stagePrefix}-SnetdConfigBucket`, {
      bucketName: `${stagePrefix}-snetd-config`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }

  private createTaskRole(stagePrefix: string, configBucket: Bucket): Role {
    // Add IAM Role for ECS Task to access S3
    const taskRole = new Role(this, `${stagePrefix}-SnetdTaskRole`, {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    configBucket.grantRead(taskRole);
    return taskRole;
  }

  private createLogGroup(stagePrefix: string): LogGroup {
    // Create a Log Group
    return new LogGroup(this, `SnetdLogGroup-${stagePrefix}`, {
      logGroupName: `/ecs/${stagePrefix}-snetd`,
    });
  }

  private createTaskDefinition(
    stagePrefix: string,
    taskRole: Role,
    configBucket: Bucket,
    logGroup: LogGroup
  ): FargateTaskDefinition {
    const loggingPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      resources: [logGroup.logGroupArn],
    });

    taskRole.addToPrincipalPolicy(loggingPolicy);

    // Create an ECS Task Definition
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${stagePrefix}-SnetdTask`,
      {
        memoryLimitMiB: 1024,
        cpu: 512,
        taskRole,
      }
    );

    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [configBucket.bucketArn + '/*'],
      })
    );

    return taskDefinition;
  }

  private addContainerToTaskDefinition(
    taskDefinition: FargateTaskDefinition,
    stagePrefix: string,
    logGroup: LogGroup
  ): void {
    const repository = Repository.fromRepositoryName(
      this,
      `${stagePrefix}-SnetdRepository`,
      'snetd'
    );
    const container = taskDefinition.addContainer(
      `${stagePrefix}-SnetdContainer`,
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
          STAGE: stagePrefix, // Pass the stage as an environment variable
        },
      }
    );

    container.addPortMappings({
      containerPort: 7001,
      protocol: Protocol.TCP,
    });
  }

  private createFargateService(
    cluster: Cluster,
    taskDefinition: FargateTaskDefinition,
    stagePrefix: string,
    snetVpc: SnetVpc
  ): void {
    new FargateService(this, `${stagePrefix}-SnetdFargateService`, {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true, // Assign public IP for public access
      vpcSubnets: {subnets: snetVpc.vpc.publicSubnets},
      securityGroups: [snetVpc.snetdSecurityGroup],
    });
  }

  // private createFargateService(
  //   cluster: Cluster,
  //   taskDefinition: FargateTaskDefinition,
  //   stagePrefix: string,
  //   snetVpc: SnetVpc
  // ): void {
  //   // Create a Fargate Service with Application Load Balancer
  //   const fargateService = new ApplicationLoadBalancedFargateService(
  //     this,
  //     `${stagePrefix}-SnetdFargateService`,
  //     {
  //       cluster,
  //       taskDefinition,
  //       publicLoadBalancer: true,
  //     }
  //   );

  //   // Open port 7001 for the Load Balancer
  //   fargateService.service.connections.allowFromAnyIpv4(Port.tcp(7001));
  //   fargateService.service.connections.addSecurityGroup(
  //     snetVpc.snetdSecurityGroup
  //   );
  // }
}
