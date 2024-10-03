import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import * as jose from 'jose';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from './utils/logger';
import { dynamoDocumentClient } from './utils/aws-clients';
import * as AccountApi from '../api-account.json';
import { AllowedScopesPolicy, AllowedScopesPolicyRecordKey } from './types';

type CognitoAccessToken = jose.JWTPayload & {
  sub: string;
  token_use: string;
  client_id: string;
  scope: string;
  auth_time: number;
};

type MethodDetails = {
  apiId: string;
  resourceMethod: string;
  resourceName: string;
};

const tokenSigningKeyUrl = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`;

// Extracts endpoint details from the sourceMethodArn field of Lambda authorizer event
const getMethodDetails = (sourceMethodArn: string): MethodDetails => {
  const parts = sourceMethodArn.split('/');

  const methodArnParts = parts.shift().split(':');
  const apiId = methodArnParts.pop();

  parts.shift(); // Remove the env part
  const resourceMethod = parts.shift();
  const resourceName = `/${parts.join('/')}`;
  return {
    apiId,
    resourceMethod,
    resourceName,
  };
};

const verifyToken = async (token: string): Promise<CognitoAccessToken> => {
  const jwks = jose.createRemoteJWKSet(new URL(tokenSigningKeyUrl));
  const { payload } = await jose.jwtVerify<CognitoAccessToken>(token, jwks);
  return payload;
};

const resolveOpenApiOperationId = async (methodDetails: MethodDetails): Promise<string> => {
  // Todo: implement dynamic spec file definition (depending on API ID)
  let matchedOperationId: string;

  Object.keys(AccountApi.paths).forEach((specPath) => {
    const pathRegex = specPath.replace(/\{[^}]+\}/g, '[^/]+');

    // Check if the actual URL path matches the generated regex
    // If the method also matches, you have found the matching endpoint
    const regex = new RegExp(`^${pathRegex}$`);
    if (regex.test(methodDetails.resourceName)) {
      const matchedEndpoint =
        AccountApi.paths[specPath][methodDetails.resourceMethod.toLowerCase()];
      if (matchedEndpoint) {
        matchedOperationId = matchedEndpoint.operationId;
      }
    }
  });

  if (!matchedOperationId) {
    throw new Error('Operation was not resolved in OpenAPI spec');
  }
  return matchedOperationId;
};

const validateToken = async (
  methodArn: string,
  tokenPayload: CognitoAccessToken,
): Promise<void> => {
  // Todo: implement token expiration
  // ...

  // Check app client permissions against specified API resource
  const methodDetails = getMethodDetails(methodArn);
  const operationId = await resolveOpenApiOperationId(methodDetails);

  logger.debug('Method details', { methodDetails });
  const getItemCommand = new GetCommand({
    TableName: process.env.CLIENT_SCOPES_TABLE,
    Key: {
      principal: tokenPayload.client_id,
      resource: methodDetails.apiId,
    } satisfies AllowedScopesPolicyRecordKey,
  });
  const clientPermissionsRecord = (await dynamoDocumentClient.send(getItemCommand))
    .Item as AllowedScopesPolicy;
  if (!clientPermissionsRecord.action.includes(operationId)) {
    throw new Error(
      `Client ${tokenPayload.client_id} does not have enough permissions to call ${methodDetails.resourceMethod} endpoint of the ${methodDetails.apiId} API`,
    );
  }
};

const generateAuthorizerResult = (
  principal: string,
  resource: string,
  effect: 'Allow' | 'Deny',
): APIGatewayAuthorizerResult => {
  const result = {
    principalId: principal,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };

  logger.debug('Resulting policy', { result });
  return result;
};

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  logger.debug('Event', { event });
  let clientId = 'undefined';

  try {
    // Verification
    const payload = await verifyToken(event.authorizationToken.split(' ')[1]);
    logger.debug('Token payload', { payload });

    // Validation
    clientId = payload.client_id;
    await validateToken(event.methodArn, payload);
  } catch (err) {
    logger.error('Token verification/validation error', { err });
    return generateAuthorizerResult(clientId, event.methodArn, 'Deny');
  }

  // If verification and validation succeeded
  return generateAuthorizerResult(clientId, event.methodArn, 'Allow');
};
