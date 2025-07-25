"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from "lucide-react";
import { ErrorType } from "@/lib/error-handler";

// Function to determine error type from error object
function getErrorType(error: Error & { digest?: string; type?: string }): string {
  // If our AppError type is used, it will have a type property
  if (error.type) {
    return error.type;
  }
  
  // Try to infer error type from message or name
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  if (message.includes('not found') || name.includes('notfound')) {
    return ErrorType.NOT_FOUND;
  }
  
  if (message.includes('validation') || name.includes('validation')) {
    return ErrorType.VALIDATION;
  }
  
  if (message.includes('unauthorized') || message.includes('unauthenticated') ||
      name.includes('auth')) {
    return ErrorType.AUTHENTICATION;
  }
  
  if (message.includes('permission') || message.includes('forbidden')) {
    return ErrorType.AUTHORIZATION;
  }
  
  if (message.includes('database') || message.includes('mongo') ||
      message.includes('connection')) {
    return ErrorType.DATABASE;
  }
  
  // Default to server error
  return ErrorType.SERVER;
}

// Function to get user-friendly error message
function getUserFriendlyMessage(errorType: string): string {
  switch (errorType) {
    case ErrorType.VALIDATION:
      return "The information provided is invalid or incomplete.";
    case ErrorType.AUTHENTICATION:
      return "You need to be logged in to access this resource.";
    case ErrorType.AUTHORIZATION:
      return "You don't have permission to access this resource.";
    case ErrorType.NOT_FOUND:
      return "The requested resource could not be found.";
    case ErrorType.DATABASE:
      return "We're having trouble connecting to our database.";
    case ErrorType.EXTERNAL_SERVICE:
      return "We're having trouble connecting to an external service.";
    case ErrorType.SERVER:
    default:
      return "We encountered an unexpected error. Please try again or contact support.";
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; type?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const errorType = getErrorType(error);
  const userFriendlyMessage = getUserFriendlyMessage(errorType);
  
  // Copy error details to clipboard for easy reporting
  const copyErrorDetails = () => {
    const errorDetails = JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack,
      digest: error.digest,
      type: errorType,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    }, null, 2);
    
    navigator.clipboard.writeText(errorDetails)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy error details:', err));
  };
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      digest: error.digest,
      type: errorType,
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
    
    // Here you would typically send the error to a reporting service like Sentry
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error);
    // }
  }, [error, errorType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            {userFriendlyMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="p-3 bg-gray-100 rounded-md overflow-auto max-h-40">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-semibold">Error Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyErrorDetails}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-gray-700 font-mono">{error.message}</p>
              {error.stack && (
                <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                  {error.stack.split('\n').slice(0, 3).join('\n')}
                </pre>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Type: {errorType} | Digest: {error.digest || 'N/A'}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go home
            </Button>
          </div>
        </CardContent>
        {process.env.NODE_ENV === "development" && (
          <CardFooter className="text-xs text-gray-500 justify-center">
            <div className="flex items-center">
              <Bug className="h-3 w-3 mr-1" />
              <span>Development Mode - Error details are hidden in production</span>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
