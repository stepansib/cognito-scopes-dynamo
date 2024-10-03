import { DeleteCommand, PutCommand, ScanCommand, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { AllowedScopesPolicy, AllowedScopesPolicyRecordKey } from './types';
import { dynamoDocumentClient } from './utils/aws-clients';

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
        principal: item.principal,
        resource: item.resource,
      } satisfies AllowedScopesPolicyRecordKey,
    });
    cleanupPromises.push(dynamoDocumentClient.send(deleteCommand));
  });
  await Promise.all(cleanupPromises);

  // Setup client scopes config
  const putCommand = new PutCommand({
    TableName: process.env.CLIENT_SCOPES_TABLE,
    Item: {
      principal: process.env.APP_CLIENT_ID,
      resource: process.env.REST_API_ID,
      action: ['getAccount', 'createAccount'],
    } satisfies AllowedScopesPolicy,
  });
  await dynamoDocumentClient.send(putCommand);
};
