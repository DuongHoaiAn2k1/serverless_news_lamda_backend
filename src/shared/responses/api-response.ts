import type { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function successResponse<T>(data: T, statusCode: number = 200, metadata?: ApiResponseBody['metadata']): APIGatewayProxyResult {
  const body: ApiResponseBody<T> = {
    success: true,
    data,
    ...(metadata && { metadata }),
  };

  return {
    statusCode,
    headers: getDefaultHeaders(),
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
): APIGatewayProxyResult {
  const body: ApiResponseBody = {
    success: false,
    error: { code, message, ...(details && { details }) },
  };

  return {
    statusCode,
    headers: getDefaultHeaders(),
    body: JSON.stringify(body),
  };
}

export function getDefaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}