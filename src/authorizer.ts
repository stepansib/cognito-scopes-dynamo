import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import * as jose from 'jose';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import YAML from 'yaml';
import * as fs from 'node:fs';
import { logger } from './utils/logger';
import { dynamoDocumentClient } from './utils/aws-clients';
import { AllowedScopesPolicy, AllowedScopesPolicyRecordKey } from './types';

const OAUTH2_OPENAPI_SECURITY_SCHEMA = 'oauth2ClientCredentials';

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
const spec = YAML.parse(fs.readFileSync('./api.yaml').toString());

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

const resolveOperationRequiredScopes = (methodDetails: MethodDetails): string[] => {
  // Find matching OpenApi path by URL and HTTP method by iterating all paths in API spec
  let operationDefinition: {
    security?: Record<string, string[]>;
  };
  Object.keys(spec.paths).forEach((specPath) => {
    const pathRegex = specPath.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${pathRegex}$`);
    if (
      regex.test(methodDetails.resourceName) &&
      spec.paths[specPath][methodDetails.resourceMethod.toLowerCase()]
    ) {
      operationDefinition = spec.paths[specPath][methodDetails.resourceMethod.toLowerCase()];
    }
  });
  if (!operationDefinition)
    throw new Error(
      `No matching operation found in API spec: ${methodDetails.resourceMethod} "${methodDetails.resourceName}"`,
    );

  // Check if custom authorizer security schema defined for the operation
  let requiredScopes: string[] = [];
  if (operationDefinition && Array.isArray(operationDefinition.security)) {
    operationDefinition.security.forEach((securitySchema) => {
      if (securitySchema[OAUTH2_OPENAPI_SECURITY_SCHEMA]) {
        requiredScopes = securitySchema[OAUTH2_OPENAPI_SECURITY_SCHEMA];
      }
    });
  }

  return requiredScopes;
};

const validateToken = async (
  methodArn: string,
  tokenPayload: CognitoAccessToken,
): Promise<void> => {
  // Check app client permissions against specified API resource
  const methodDetails = getMethodDetails(methodArn);
  logger.debug('Method details', { methodDetails });

  // Get required scopes for API operation
  const requiredOperationScopes = resolveOperationRequiredScopes(methodDetails);

  // Get app client allowed scopes
  const getItemCommand = new GetCommand({
    TableName: process.env.CLIENT_SCOPES_TABLE,
    Key: {
      client: tokenPayload.client_id,
    } satisfies AllowedScopesPolicyRecordKey,
  });

  let clientScopes;
  try {
    clientScopes = (await dynamoDocumentClient.send(getItemCommand)).Item as AllowedScopesPolicy;
  } catch (err) {
    throw new Error(`No configuration found for ${tokenPayload.client_id} client`);
  }

  // Check if client has all the required scopes
  requiredOperationScopes.forEach((requiredScope) => {
    if (!clientScopes.scopes.includes(requiredScope)) {
      throw new Error(
        `Client ${tokenPayload.client_id} does not have required scope "${requiredScope}" to call ${methodDetails.resourceMethod} "${methodDetails.resourceName}" endpoint of the ${methodDetails.apiId} API`,
      );
    }
  });

  // Check if access token has all the required scopes
  requiredOperationScopes.forEach((requiredScope) => {
    if (!tokenPayload.scope.split(' ').includes(requiredScope)) {
      throw new Error(
        `Access token does not have required scope "${requiredScope}" to call ${methodDetails.resourceMethod} "${methodDetails.resourceName}" endpoint of the ${methodDetails.apiId} API`,
      );
    }
  });
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
