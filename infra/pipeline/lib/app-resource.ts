import cdk = require('@aws-cdk/core');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam')

export interface AppResourceProps extends cdk.StackProps {
    appName: string;
    prodStage: boolean;
    stackPrefix: string;
    removalPolicy: cdk.RemovalPolicy
}

export class AppResource extends cdk.Construct {
    public readonly taskRole: iam.Role;

    constructor(scope: cdk.Construct, name: string, props: AppResourceProps) {
        super(scope, name);
        const resourcePrefix = props.appName + '-' + (props.prodStage ? 'prod' : 'dev') + '-';

        const taskRole = new iam.Role(this, 'FargateTaskRole', {
            roleName: resourcePrefix + 'FargateTaskRole',
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        const productTable = new dynamodb.Table(this, 'productTable', {
            tableName: resourcePrefix + 'product',
            partitionKey: { name: 'pid', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: props.removalPolicy
        });
        productTable.addGlobalSecondaryIndex({
            indexName: "product-category-index",
            partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
        });

        taskRole.addToPolicy(new iam.PolicyStatement({
            resources: [
                productTable.tableArn,
                productTable.tableArn + '/index/*',
            ],
            actions: ["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:scan"],
        }));
        this.taskRole = taskRole
    }
}