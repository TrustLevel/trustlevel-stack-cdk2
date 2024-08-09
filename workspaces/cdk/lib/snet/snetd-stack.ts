import {Duration, Stack, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  Protocol as ECSProtocol,
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
import * as S3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import {IVpc, Peer, Port, SecurityGroup} from 'aws-cdk-lib/aws-ec2';
import {SnetVpc} from '../vpcs/snet-vpc-stack';
import {HostedZone, ARecord, RecordTarget} from 'aws-cdk-lib/aws-route53';
import {LoadBalancerTarget} from 'aws-cdk-lib/aws-route53-targets';
import {
  NetworkLoadBalancer,
  INetworkTargetGroup,
  NetworkTargetGroup,
  TargetType,
  AlpnPolicy,
  Protocol,
  NetworkListenerAction,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';

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

    const nlb = this.createNetworkLoadBalancer(props.snetVpc, stagePrefix);
    const certificate = this.associateDomainWithNLB(
      nlb,
      stagePrefix,
      props.stage
    );

    this.createFargateService(
      ecsCluster,
      taskDefinition,
      stagePrefix,
      props.snetVpc,
      nlb,
      certificate
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
    const configBucket = new Bucket(this, `${stagePrefix}-SnetdConfigBucket`, {
      bucketName: `${stagePrefix}-snetd-config`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    // Fill bucket with configuration files
    new S3Deployment.BucketDeployment(this, 'SnetdConfigDeployment', {
      sources: [S3Deployment.Source.asset(`../../docker/snetd/configs/${stagePrefix}`, {exclude: ['**', '!snetd.config.json']})],
      destinationBucket: configBucket,
    }); 

    return configBucket
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
      removalPolicy: RemovalPolicy.DESTROY,
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
        healthCheck: {  
          // TODO: figure out why curl -f http://localhost:7001/heartbeat || exit 1 is not working
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
      protocol: ECSProtocol.TCP,
    });
  }

  private createNetworkLoadBalancer(
    snetVpc: SnetVpc,
    stagePrefix: string
  ): NetworkLoadBalancer {

    const nlb = new NetworkLoadBalancer(this, `${stagePrefix}-SnetdNLB`, {
      vpc: snetVpc.vpc,
      internetFacing: true,
      loadBalancerName: `${stagePrefix}-SnetdNLB`,
    });

    return nlb;
  }

  private createFargateService(
    cluster: Cluster,
    taskDefinition: FargateTaskDefinition,
    stagePrefix: string,
    snetVpc: SnetVpc,
    nlb: NetworkLoadBalancer,
    certificate: Certificate
  ): void {
    const snetdSecurityGroup = new SecurityGroup(
      this,
      `${stagePrefix}-SnetdSecurityGroup`,
      {
        vpc: snetVpc.vpc,
        allowAllOutbound: true,
      }
    );

    snetdSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.allTraffic(),
      'Allow all inbound traffic for testing'
    );

    const service = new FargateService(
      this,
      `${stagePrefix}-SnetdFargateService`,
      {
        cluster,
        serviceName: `${stagePrefix}-SnetdFargateService`,
        taskDefinition,
        desiredCount: 1,
        assignPublicIp: true, // Assign public IP for public access
        vpcSubnets: {subnets: snetVpc.vpc.publicSubnets},
        securityGroups: [snetdSecurityGroup],
      }
    );

    const targetGroup: INetworkTargetGroup = new NetworkTargetGroup(
      this,
      `${stagePrefix}-SnetdTargetGroup`,
      {
        vpc: snetVpc.vpc,
        port: 7001,
        protocol: Protocol.TCP, // For the target group protocol
        targetType: TargetType.IP,
        healthCheck: {
          enabled: true,
          interval: Duration.seconds(30),
          path: '/heartbeat', // Health check path
          protocol: Protocol.HTTP,
          healthyHttpCodes: '200', // Expected gRPC code for healthy response
        },
      }
    );

    nlb.addListener(`${stagePrefix}-TLSListener`, {
      port: 443,
      certificates: [certificate],
      alpnPolicy: AlpnPolicy.HTTP2_OPTIONAL,
      defaultAction: NetworkListenerAction.forward([targetGroup]),
    });
    targetGroup.addTarget(service);
  }

  private associateDomainWithNLB(
    nlb: NetworkLoadBalancer,
    stagePrefix: string,
    stage: Stage
  ): Certificate {
    const domainName = 'trust-level.com'; // Replace with your domain name
    const hostedZone = HostedZone.fromLookup(this, 'TrustlevelHostedZone', {
      domainName: domainName,
    });

    const recordName = stage === Stage.dev ? `dev.${domainName}` : domainName;

    new ARecord(this, `${stagePrefix}-NLBAliasRecord`, {
      zone: hostedZone,
      recordName: recordName,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(nlb)),
    });

    return new Certificate(this, `${stagePrefix}-Certificate`, {
      domainName: recordName,
      validation: CertificateValidation.fromDns(hostedZone),
    });
  }
}
