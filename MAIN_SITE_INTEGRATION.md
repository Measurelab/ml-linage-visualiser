# Main Site Integration Guide

This guide explains how to securely integrate the BigQuery Lineage Visualizer into your main site using an authenticated iframe with proxy.

## Overview

The lineage tool is configured to only accept requests with proper authentication headers. Your main site will proxy requests to the tool, adding the required authentication automatically.

## Step 1: Environment Variables

Add these to your **main site's** Vercel environment variables:

```env
# The URL of your deployed lineage tool
TOOL_URL=https://your-lineage-tool.vercel.app

# Shared secret (must match VITE_TOOL_SECRET in lineage tool)
TOOL_SECRET=your-very-secure-shared-secret-key

# Your main site URL (for CORS)
NEXT_PUBLIC_SITE_URL=https://your-main-site.vercel.app
```

Add these to your **lineage tool's** Vercel environment variables:

```env
# Development password for the login screen
VITE_DEV_PASSWORD=your_password_here

# Shared secret for HMAC authentication
VITE_TOOL_SECRET=your-very-secure-shared-secret-key

# Your main site URL (must match exactly)
VITE_ALLOWED_ORIGIN=https://your-main-site.vercel.app

# Set to true in production
VITE_REQUIRE_AUTH=true
```

## Step 2: Create Proxy API Route (Main Site)

Create `/pages/api/tool-proxy/[...path].ts` or `/app/api/tool-proxy/[...path]/route.ts` (for App Router):

### Pages Router Version:
```typescript
// pages/api/tool-proxy/[...path].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createHmac } from 'crypto';

const TOOL_URL = process.env.TOOL_URL || 'https://your-lineage-tool.vercel.app';
const TOOL_SECRET = process.env.TOOL_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the path to proxy
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path || '';
  
  // Generate authentication headers
  const timestamp = Date.now().toString();
  const authToken = 'main-site-access';
  const signature = createHmac('sha256', TOOL_SECRET)
    .update(`${authToken}:${timestamp}`)
    .digest('hex');

  // Build the target URL
  const targetUrl = `${TOOL_URL}/${targetPath}`;
  
  try {
    // Forward the request with authentication
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers as any,
        'X-Tool-Auth': authToken,
        'X-Tool-Timestamp': timestamp,
        'X-Tool-Signature': signature,
        'Host': new URL(TOOL_URL).host,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Forward the response
    const data = await response.text();
    
    // Copy response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    res.status(response.status);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
```

### App Router Version:
```typescript
// app/api/tool-proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const TOOL_URL = process.env.TOOL_URL || 'https://your-lineage-tool.vercel.app';
const TOOL_SECRET = process.env.TOOL_SECRET || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

async function handleRequest(request: NextRequest, pathSegments: string[]) {
  const targetPath = pathSegments.join('/');
  
  // Generate authentication headers
  const timestamp = Date.now().toString();
  const authToken = 'main-site-access';
  const signature = createHmac('sha256', TOOL_SECRET)
    .update(`${authToken}:${timestamp}`)
    .digest('hex');

  // Build the target URL
  const url = new URL(request.url);
  const targetUrl = `${TOOL_URL}/${targetPath}${url.search}`;
  
  try {
    // Forward the request with authentication
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'X-Tool-Auth': authToken,
        'X-Tool-Timestamp': timestamp,
        'X-Tool-Signature': signature,
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
    });

    // Create response with proper headers
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'text/html',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}
```

## Step 3: Create Iframe Component (Main Site)

Create a component to embed the tool:

```tsx
// components/LineageToolEmbed.tsx
import { useState, useEffect } from 'react';

export default function LineageToolEmbed() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the proxy path instead of direct URL
  const toolUrl = '/api/tool-proxy';
  
  return (
    <div className="relative w-full h-screen">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading lineage visualizer...</p>
          </div>
        </div>
      )}
      <iframe
        src={toolUrl}
        className="w-full h-full border-0"
        onLoad={() => setIsLoading(false)}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="BigQuery Lineage Visualizer"
      />
    </div>
  );
}
```

## Step 4: Use the Component (Main Site)

Add the component to your page:

```tsx
// pages/tools/lineage.tsx or app/tools/lineage/page.tsx
import LineageToolEmbed from '@/components/LineageToolEmbed';

export default function LineagePage() {
  return (
    <div className="min-h-screen">
      <LineageToolEmbed />
    </div>
  );
}
```

## Step 5: Testing

### Local Development Testing

1. **Lineage Tool** - Run with auth disabled:
   ```bash
   VITE_REQUIRE_AUTH=false npm run dev
   ```

2. **Main Site** - Set up local proxy:
   ```bash
   TOOL_URL=http://localhost:3000 npm run dev
   ```

### Production Testing

1. Deploy both applications to Vercel with the environment variables set
2. Access the tool through your main site at `/tools/lineage` (or wherever you placed it)
3. Verify direct access to the tool URL returns "Unauthorized"

## Security Checklist

- [ ] Generate a strong, random `TOOL_SECRET` (at least 32 characters)
- [ ] Set `VITE_REQUIRE_AUTH=true` in production
- [ ] Verify `VITE_ALLOWED_ORIGIN` matches your main site exactly
- [ ] Test that direct access to the tool is blocked
- [ ] Confirm the iframe loads correctly through the proxy
- [ ] Check browser console for any CORS or CSP errors
- [ ] Verify the health check endpoint works: `/api/tool-proxy/api/health`

## Troubleshooting

### "Unauthorized: Missing authentication headers"
- Check that the proxy is adding the authentication headers correctly
- Verify environment variables are set in Vercel

### Iframe won't load
- Check browser console for CSP errors
- Verify `VITE_ALLOWED_ORIGIN` matches exactly (including https://)
- Ensure proxy route is working (test `/api/tool-proxy/api/health`)

### "Invalid signature" error
- Ensure `TOOL_SECRET` matches exactly on both sites
- Check for trailing spaces in environment variables
- Verify both sites are using the same hashing algorithm

### CORS errors
- Verify `VITE_ALLOWED_ORIGIN` is set correctly
- Check that the proxy is forwarding the correct headers
- Ensure the main site URL includes the protocol (https://)

## Additional Security Options

### Option 1: IP Whitelisting
Add Vercel's Edge Config to restrict by IP if needed.

### Option 2: User Session Validation
Pass user session tokens through the iframe for additional validation.

### Option 3: Rate Limiting
Add rate limiting to the proxy endpoint to prevent abuse.

## Support

For issues or questions about the integration, check:
1. Browser developer console for errors
2. Vercel function logs for both applications
3. Network tab to verify authentication headers are present