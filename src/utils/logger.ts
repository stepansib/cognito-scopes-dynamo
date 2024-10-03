import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: process.env.SERVICE_NAME, logLevel: 'DEBUG' });

export { logger };
