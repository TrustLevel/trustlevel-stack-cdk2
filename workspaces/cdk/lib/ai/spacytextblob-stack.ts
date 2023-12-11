import {App, Stack} from 'aws-cdk-lib';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  FargateService,
} from 'aws-cdk-lib/aws-ecs';
import {IVpc} from 'aws-cdk-lib/aws-ec2';
import {StagedStackProps} from '../../bin/stagedStackProps';
import {Stage} from '../../bin/stages';

interface SpacytextblobStackProps extends StagedStackProps {
  vpc: IVpc;
}

export class SpacytextblobStack extends Stack {
  constructor(scope: App, id: string, props: SpacytextblobStackProps) {
    super(scope, id, props);

    // Use the provided VPC
    const cluster = new Cluster(
      this,
      `${Stage[props!.stage]}-SpacytextblobCluster`,
      {
        vpc: props.vpc,
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

    // Create Fargate Service
    const service = new FargateService(
      this,
      `${Stage[props!.stage]}-SpacytextblobService`,
      {
        cluster,
        taskDefinition,
      }
    );

    // Configure the service to not be publicly accessible
    // Note: Specific configurations depend on your network setup and security requirements
    //service.connections.allowFrom(lambdaFunction, ec2.Port.tcp(80)); // Allow only Lambda function
  }
}
