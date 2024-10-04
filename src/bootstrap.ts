import { DeleteCommand, PutCommand, ScanCommand, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AllowedScopesPolicy, AllowedScopesPolicyRecordKey } from './types';
import { cognitoClient, dynamoDocumentClient } from './utils/aws-clients';

export const handler = async (): Promise<void> => {
  // Erase client scopes config
  const scanCommand = new ScanCommand({
    TableName: process.env.CLIENT_SCOPES_TABLE,
  });
  const existingItems: ScanCommandOutput = await dynamoDocumentClient.send(scanCommand);
  const cleanupPromises = [];
  existingItems.Items.forEach((item: AllowedScopesPolicy) => {
    const deleteCommand = new DeleteCommand({
      TableName: process.env.CLIENT_SCOPES_TABLE,
      Key: {
        client: item.client,
      } satisfies AllowedScopesPolicyRecordKey,
    });
    cleanupPromises.push(dynamoDocumentClient.send(deleteCommand));
  });
  await Promise.all(cleanupPromises);

  // Setup client scopes config

  const describeUserPoolClientCommand = new DescribeUserPoolClientCommand({
    UserPoolId: process.env.USER_POOL_ID,
    ClientId: process.env.APP_CLIENT_ID,
  });
  const userPoolClient = (await cognitoClient.send(describeUserPoolClientCommand)).UserPoolClient;

  const putCommand = new PutCommand({
    TableName: process.env.CLIENT_SCOPES_TABLE,
    Item: {
      client: process.env.APP_CLIENT_ID,
      scopes: userPoolClient.AllowedOAuthScopes,
    } satisfies AllowedScopesPolicy,
  });
  await dynamoDocumentClient.send(putCommand);
};
