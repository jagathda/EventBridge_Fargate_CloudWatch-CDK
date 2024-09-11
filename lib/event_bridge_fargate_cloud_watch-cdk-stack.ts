import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class EventBridgeFargateCloudWatchCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for ECS
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2
    });

  }
}
