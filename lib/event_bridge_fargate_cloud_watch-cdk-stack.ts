import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventstargets from 'aws-cdk-lib/aws-events-targets';

export class EventBridgeFargateCloudWatchCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for ECS
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2
    });

    // ECS cluster
    const cluster = new ecs.Cluster(this, 'MyCluster', {
      vpc: vpc
    });

    // Define ECR repository
    const repository = ecr.Repository.fromRepositoryName(this, 'MyRepo', 'my-docker-repo');

    // ECS task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef');

    // Define container in task definition
    const container = taskDefinition.addContainer('MyContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'MyAppLogs',
        logGroup: new logs.LogGroup(this, 'LogGroup', {
          logGroupName: '/ecs/MyApp',
          removalPolicy: cdk.RemovalPolicy.DESTROY
        })
      })
    });

    // Define fargate service
    const fargateService =new ecs.FargateService(this, 'MyFargateService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      assignPublicIp: true
    });

    // Define eventbridge rule
    const rule = new events.Rule(this, 'MyEventRule', {
      eventPattern: {
        source: ['custom.my-application']
      }
    });

    // Add target to eventbridge rule (ecs task)
    rule.addTarget(new eventstargets.EcsTask({
      cluster: cluster,
      taskDefinition: taskDefinition,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC},
      assignPublicIp: true
    }));

  }
}
