import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 100; // Maximum requests per window

// In-memory store for rate limiting (would use Redis in a real production app)
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

// Clean up the rate limit store periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60 * 1000); // Clean up every minute

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get client IP address
  const ip = request.ip || 'unknown';
  
  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  
  // Add Strict-Transport-Security header in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  // Implement basic rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const now = Date.now();
    
    // Initialize or get the rate limit data for this IP
    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW,
      };
    }
    
    const rateLimitData = rateLimitStore[ip];
    
    // Reset count if the window has passed
    if (rateLimitData.resetTime < now) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    // Increment request count
    rateLimitData.count++;
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitData.count).toString());
    response.headers.set('X-RateLimit-Reset', rateLimitData.resetTime.toString());
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (rateLimitData.count > MAX_REQUESTS_PER_WINDOW) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            message: 'Too many requests, please try again later.',
            type: 'RATE_LIMIT_EXCEEDED'
          }
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitData.resetTime.toString(),
          },
        }
      );
    }
  }
  
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Apply to all routes except static files, images, and other assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|webp)).*)',
  ],
};