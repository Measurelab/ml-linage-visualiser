import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// Skip auth in development unless explicitly enabled
const REQUIRE_AUTH = process.env.VITE_REQUIRE_AUTH === 'true' || process.env.NODE_ENV === 'production';
const TOOL_SECRET = process.env.VITE_TOOL_SECRET || 'development-secret-key';
const ALLOWED_ORIGIN = process.env.VITE_ALLOWED_ORIGIN || 'http://localhost:3001';

export function middleware(request: NextRequest) {
  // Skip authentication for local development if not required
  if (!REQUIRE_AUTH && process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  // Allow health check endpoint
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  // Get authentication headers
  const authHeader = request.headers.get('X-Tool-Auth');
  const timestamp = request.headers.get('X-Tool-Timestamp');
  const signature = request.headers.get('X-Tool-Signature');

  // Check if all required headers are present
  if (!authHeader || !timestamp || !signature) {
    return new NextResponse('Unauthorized: Missing authentication headers', { 
      status: 401,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  // Verify timestamp (prevent replay attacks - 5 minute window)
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (isNaN(requestTime) || timeDiff > 5 * 60 * 1000) {
    return new NextResponse('Unauthorized: Invalid or expired timestamp', { 
      status: 401,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  // Verify signature
  const expectedSignature = createHmac('sha256', TOOL_SECRET)
    .update(`${authHeader}:${timestamp}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new NextResponse('Unauthorized: Invalid signature', { 
      status: 401,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  // Add security headers to response
  const response = NextResponse.next();
  
  // Allow framing only from the specified origin
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy', `frame-ancestors 'self' ${ALLOWED_ORIGIN}`);
  
  // Add CORS headers if needed
  if (request.headers.get('origin') === ALLOWED_ORIGIN) {
    response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'X-Tool-Auth, X-Tool-Timestamp, X-Tool-Signature, Content-Type');
  }

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};