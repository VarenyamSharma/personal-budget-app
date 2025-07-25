import { NextResponse } from 'next/server';

/**
 * Error types for the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  SERVER = 'SERVER_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR'
}

/**
 * Application error class with standardized structure
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType = ErrorType.SERVER,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Capture stack trace (excluding constructor call)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error factory methods for common error types
 */
export const createError = {
  validation: (message: string, details?: any) => 
    new AppError(message, ErrorType.VALIDATION, 400, true, details),
    
  authentication: (message: string = 'Authentication required') => 
    new AppError(message, ErrorType.AUTHENTICATION, 401),
    
  authorization: (message: string = 'Not authorized') => 
    new AppError(message, ErrorType.AUTHORIZATION, 403),
    
  notFound: (message: string = 'Resource not found') => 
    new AppError(message, ErrorType.NOT_FOUND, 404),
    
  database: (message: string, details?: any) => 
    new AppError(message, ErrorType.DATABASE, 500, true, details),
    
  server: (message: string = 'Internal server error') => 
    new AppError(message, ErrorType.SERVER, 500),
    
  externalService: (message: string, details?: any) => 
    new AppError(message, ErrorType.EXTERNAL_SERVICE, 502, true, details)
};

/**
 * Handles errors in API routes and returns appropriate responses
 * @param error The error to handle
 * @returns NextResponse with appropriate status and error details
 */
export function handleApiError(error: unknown) {
  // Default to internal server error
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorType = ErrorType.SERVER;
  let errorDetails = undefined;
  
  // Log the error (conditionally based on environment)
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
    console.error('API Error:', error);
  } else {
    // In production, log minimal information
    console.error('API Error occurred');
  }
  
  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorMessage = error.message;
    errorType = error.type;
    errorDetails = error.details;
  } 
  // Handle standard Error instances
  else if (error instanceof Error) {
    errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' // Generic message in production
      : error.message;          // Actual message in development
  }
  
  // Create the error response
  const errorResponse = {
    success: false,
    error: {
      type: errorType,
      message: errorMessage,
      ...(process.env.NODE_ENV !== 'production' && errorDetails ? { details: errorDetails } : {})
    }
  };
  
  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Wraps an API handler with error handling
 * @param handler The API handler function to wrap
 * @returns A wrapped handler function with error handling
 */
export function withErrorHandling(handler: Function) {
  return async function(req: Request, ...args: any[]) {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}