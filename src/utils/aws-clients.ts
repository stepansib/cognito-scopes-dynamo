import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const clientOptions = {
  region: process.env.AWS_REGION,
};
const dynamoClient = new DynamoDBClient(clientOptions);
const dynamoDocumentClient = DynamoDBDocumentClient.from(dynamoClient);

export { clientOptions, dynamoDocumentClient };
