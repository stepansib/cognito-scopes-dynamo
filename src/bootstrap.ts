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
        client: item.client,
      } satisfies AllowedScopesPolicyRecordKey,
    });
    cleanupPromises.push(dynamoDocumentClient.send(deleteCommand));
  });
  await Promise.all(cleanupPromises);

  // Setup client scopes config
  // Todo: populate scopes from app client config instead of hardcoded array
  const putCommand = new PutCommand({
    TableName: process.env.CLIENT_SCOPES_TABLE,
    Item: {
      client: process.env.APP_CLIENT_ID,
      scopes: ['account/read', 'account/write'],
    } satisfies AllowedScopesPolicy,
  });
  await dynamoDocumentClient.send(putCommand);
};
