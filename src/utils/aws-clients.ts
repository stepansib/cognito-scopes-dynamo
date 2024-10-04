import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const clientOptions = {
  region: process.env.AWS_REGION,
};
const dynamoClient = new DynamoDBClient(clientOptions);
const dynamoDocumentClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient(clientOptions);

export { clientOptions, dynamoDocumentClient, cognitoClient };
