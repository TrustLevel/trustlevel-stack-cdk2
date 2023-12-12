import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {readEnvVar} from './env';
import {HttpError} from './errors';

const ALLOWED_ORIGINS = readEnvVar<string[]>('ALLOWED_ORIGINS');

export const withCors = (
  result: APIGatewayProxyResult,
  origin: string,
  allowedOrigins: string[]
): APIGatewayProxyResult => {
  if (allowedOrigins.includes('*')) {
    setOriginHeader(result, origin);
  }

  if (allowedOrigins.includes(origin)) {
    setOriginHeader(result, origin);
  }
  return result;
};

const setOriginHeader = (
  result: APIGatewayProxyResult,
  origin: string
): void => {
  if (!result.headers) {
    result.headers = {};
  }
  result.headers['Access-Control-Allow-Origin'] = origin;
  result.headers['Access-Control-Allow-Credentials'] = !false;
};

export const buildSuccessResponse = (
  event: APIGatewayProxyEvent,
  statusCode: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: Record<string, any>
): APIGatewayProxyResult => {
  const body = payload ? JSON.stringify(payload) : '';
  const result: APIGatewayProxyResult = {statusCode, body, headers};
  return withCors(result, event.headers?.origin || '', ALLOWED_ORIGINS);
};

export const buildFailureResponse = (
  event: APIGatewayProxyEvent,
  error: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any> = {}
): APIGatewayProxyResult => {
  console.error(error);
  let statusCode = 500;
  if (error instanceof HttpError) {
    statusCode = error.statusCode;
  } else {
    statusCode = 500;
  }
  const body = '';
  const result: APIGatewayProxyResult = {statusCode, body, headers};
  return withCors(result, event.headers?.origin || '', ALLOWED_ORIGINS);
};
