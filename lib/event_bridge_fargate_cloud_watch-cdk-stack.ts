import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventstargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

export class EventBridgeFargateCloudWatchCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC for the ECS cluster
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2 // Create the VPC across 2 availability zones for redundancy
    });

    // Create an ECS cluster within the VPC
    const cluster = new ecs.Cluster(this, 'MyCluster', {
      vpc: vpc // Associate the ECS cluster with the VPC
    });

    // Reference an existing ECR repository for the Docker image
    const repository = ecr.Repository.fromRepositoryName(this, 'MyRepo', 'message-logger');

    // Create an IAM role for ECS task execution
    const ecsTaskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'), // ECS tasks will assume this role
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy') // Attach the required ECS task execution policy
      ]
    });

    // Create an ECS task definition for the Fargate service
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      executionRole: ecsTaskExecutionRole // Use the defined execution role for the task
    });

    // Define the container within the ECS task
    const container = taskDefinition.addContainer('MyContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository), // Use the image from the ECR repository
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'MyAppLogs', // Prefix for CloudWatch log stream
        logGroup: new logs.LogGroup(this, 'LogGroup', {
          logGroupName: '/ecs/MyApp', // Create a log group for the application
          removalPolicy: cdk.RemovalPolicy.DESTROY // Destroy the log group when the stack is deleted
        })
      }),
      memoryLimitMiB: 512, // Set container memory limit
      cpu: 256, // Set container CPU allocation
    });

    // Define an EventBridge rule to trigger the ECS task
    const rule = new events.Rule(this, 'MyEventRule', {
      eventPattern: {
        source: ['custom.my-application'] // Define the source for triggering events
      }
    });

    // Create an IAM role for EventBridge to trigger the ECS task
    const eventBridgeRole = new iam.Role(this, 'EventBridgeRole', {
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com') // EventBridge will assume this role
    });

    // Grant EventBridge the permission to run ECS tasks
    eventBridgeRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ecs:RunTask'], // Allow EventBridge to run tasks
      resources: [taskDefinition.taskDefinitionArn] // Specify the task definition as the resource
    }));

    // Add ECS task as the target for the EventBridge rule
    rule.addTarget(new eventstargets.EcsTask({
      cluster: cluster, // Associate the ECS cluster
      taskDefinition: taskDefinition, // Specify the task definition
      role: eventBridgeRole, // IAM role for EventBridge to invoke ECS tasks
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC }, // Run task in public subnets
      assignPublicIp: true // Assign a public IP to the task
    }));
  }
}
