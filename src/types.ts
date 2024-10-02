export type AllowedScopesPolicyRecordKey = {
  client: string; // Cognito App Client ID
};

export type AllowedScopesPolicy = AllowedScopesPolicyRecordKey & {
  scopes: string[]; // List of Cognito Resource Server scopes
};
