import * as cdk from "@aws-cdk/core";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as lambda from "@aws-cdk/aws-lambda";
import * as rds from "@aws-cdk/aws-rds";

const THUNDRA_API_KEY = "THUNDRA_API_KEY";

export class RdsTestExampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "DemoVPC");

    vpc.addInterfaceEndpoint("sm", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    const lambdaSG = new ec2.SecurityGroup(this, "DemoLambdaSG", { vpc });
    const rdsSG = new ec2.SecurityGroup(this, "DemoRdsSG", { vpc });
    rdsSG.addIngressRule(lambdaSG, ec2.Port.tcp(5432));

    const database = new rds.DatabaseInstance(this, "DemoDB", {
      vpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
      ),
      securityGroups: [rdsSG],
    });

    const thundraLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "ThundraLayer",
      "arn:aws:lambda:eu-west-1:269863060030:" +
        "layer:thundra-lambda-node-layer-minified:96"
    );

    const indexFunction = new lambda.Function(this, "DemoLambdaIndex", {
      vpc,
      runtime: lambda.Runtime.NODEJS_14_X,
      layers: [thundraLayer],
      timeout: cdk.Duration.seconds(10),
      handler: "thundra_handler.wrapper",
      code: lambda.Code.inline(`
        exports.handler = async () => ({ statusCode: 200, body: "index"});
      `),
      environment: {
        thundra_apiKey: THUNDRA_API_KEY,
        thundra_agent_lambda_handler: "index.handler",
      },
    });

    const dbFunction = new lambda.Function(this, "DemoLambdaDb", {
      vpc,
      runtime: lambda.Runtime.NODEJS_14_X,
      layers: [thundraLayer],
      handler: "thundra_handler.wrapper",
      code: lambda.Code.asset("lib/dbFunction"),
      securityGroups: [lambdaSG],
      environment: {
        DB_SECRET_ARN: database.secret?.secretArn ?? "",
        thundra_apiKey: THUNDRA_API_KEY,
        thundra_agent_lambda_handler: "index.handler",
      },
    });

    database.secret?.grantRead(dbFunction);

    const httpApi = new apiGateway.HttpApi(this, "DemoHttpApi");
    httpApi.addRoutes({
      path: "/",
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.LambdaProxyIntegration({
        handler: indexFunction,
      }),
    });
    httpApi.addRoutes({
      path: "/database",
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.LambdaProxyIntegration({
        handler: dbFunction,
      }),
    });

    new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
  }
}
