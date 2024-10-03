export type AllowedScopesPolicyRecordKey = {
  principal: string; // Cognito App Client ID
  resource: string; // Api Gateway REST API ID
};

export type AllowedScopesPolicy = AllowedScopesPolicyRecordKey & {
  action: string[]; // List of Cognito Resource Server scopes
};
