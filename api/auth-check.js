import crypto from 'crypto';

export default function handler(req, res) {
  // Skip auth in development unless explicitly enabled
  const REQUIRE_AUTH = process.env.VITE_REQUIRE_AUTH === 'true' || process.env.NODE_ENV === 'production';
  const TOOL_SECRET = process.env.VITE_TOOL_SECRET || 'development-secret-key';
  const ALLOWED_ORIGIN = process.env.VITE_ALLOWED_ORIGIN || 'http://localhost:3001';

  // Allow CORS from the allowed origin
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Tool-Auth, X-Tool-Timestamp, X-Tool-Signature, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Skip authentication for local development if not required
  if (!REQUIRE_AUTH && process.env.NODE_ENV !== 'production') {
    return res.status(200).json({ 
      authenticated: true, 
      mode: 'development',
      reason: 'Auth disabled in development'
    });
  }

  console.log('Auth check - Headers received:', {
    'x-tool-auth': req.headers['x-tool-auth'],
    'x-tool-timestamp': req.headers['x-tool-timestamp'],
    'x-tool-signature': req.headers['x-tool-signature'] ? 'present' : 'missing',
    origin: req.headers.origin,
    referer: req.headers.referer
  });

  // Get authentication headers - check both lowercase and uppercase variants
  const authHeader = req.headers['x-tool-auth'] || req.headers['X-Tool-Auth'];
  const timestamp = req.headers['x-tool-timestamp'] || req.headers['X-Tool-Timestamp'];
  const signature = req.headers['x-tool-signature'] || req.headers['X-Tool-Signature'];

  // Check if all required headers are present
  if (!authHeader || !timestamp || !signature) {
    console.log('Auth check failed - Missing headers:', {
      authHeader: !!authHeader,
      timestamp: !!timestamp,
      signature: !!signature
    });
    
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Missing authentication headers',
      required: ['X-Tool-Auth', 'X-Tool-Timestamp', 'X-Tool-Signature'],
      received: Object.keys(req.headers).filter(h => h.startsWith('x-tool'))
    });
  }

  // Verify timestamp (prevent replay attacks - 5 minute window)
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (isNaN(requestTime) || timeDiff > 5 * 60 * 1000) {
    console.log('Auth check failed - Invalid timestamp:', { 
      requestTime, 
      currentTime, 
      timeDiff,
      maxAllowed: 5 * 60 * 1000 
    });
    
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Invalid or expired timestamp',
      timeDiff: timeDiff
    });
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', TOOL_SECRET)
    .update(`${authHeader}:${timestamp}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.log('Auth check failed - Invalid signature:', {
      received: signature,
      expected: expectedSignature,
      authHeader,
      timestamp
    });
    
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Invalid signature'
    });
  }

  // Authentication successful
  console.log('Auth check successful');
  res.status(200).json({ 
    authenticated: true,
    origin: ALLOWED_ORIGIN,
    mode: 'production'
  });
}