import { EventBridgeEvent } from 'aws-lambda';
import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from './utils/logger';
import { AllowedScopesPolicy, AllowedScopesPolicyRecordKey } from './types';
import { dynamoDocumentClient } from './utils/aws-clients';

type AppClientIdParameters = {
  userPoolId: string;
  clientId: string;
};

type AppClientApiCallResponse = {
  userPoolClient: AppClientIdParameters & {
    allowedOAuthScopes?: string[];
  };
};

type AbstractAppClientApiCall = {
  eventTime: string;
  eventName: string;
  requestParameters: AppClientIdParameters;
  responseElements?: AppClientApiCallResponse;
};

type CreateAppClientApiCall = AbstractAppClientApiCall & {
  eventName: 'CreateUserPoolClient';
};

type UpdateAppClientApiCall = AbstractAppClientApiCall & {
  eventName: 'UpdateUserPoolClient';
};

type DeleteAppClientApiCall = AbstractAppClientApiCall & {
  eventName: 'DeleteUserPoolClient';
  responseElements: null;
};

type AppClientApiCall = CreateAppClientApiCall | UpdateAppClientApiCall | DeleteAppClientApiCall;

export const handler = async (event: EventBridgeEvent<string, AppClientApiCall>): Promise<void> => {
  // Log incoming event
  logger.debug('Invocation event', { event });

  // Don't track updates for app clients that don't belong to our user pool
  if (process.env.USER_POOL_ID !== event.detail.requestParameters.userPoolId) {
    logger.info(`Client belongs to unsupported user pool`, {
      details: {
        givenUserPoolId: event.detail.requestParameters.userPoolId,
        expectedUserPoolId: process.env.USER_POOL_ID,
      },
    });
    return;
  }

  if (['CreateUserPoolClient', 'UpdateUserPoolClient'].includes(event.detail.eventName)) {
    const { clientId, allowedOAuthScopes = [] } = event.detail.responseElements.userPoolClient;
    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: process.env.CLIENT_SCOPES_TABLE,
        Item: {
          client: clientId,
          scopes: allowedOAuthScopes,
        } satisfies AllowedScopesPolicy,
      }),
    );
    logger.info('Client allowed scopes policy config added/updated', {
      details: {
        clientId,
        allowedOAuthScopes,
      },
    });
    return;
  }

  if (event.detail.eventName === 'DeleteUserPoolClient') {
    const { clientId } = event.detail.requestParameters;
    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: process.env.CLIENT_SCOPES_TABLE,
        Key: {
          client: clientId,
        } satisfies AllowedScopesPolicyRecordKey,
      }),
    );
    logger.info('Client allowed scopes policy config removed', {
      details: { clientId },
    });
    return;
  }

  throw new Error(`Unsupported API call: ${event.detail.eventName}`);
};
