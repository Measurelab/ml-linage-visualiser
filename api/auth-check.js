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
    return res.status(200).json({ authenticated: true });
  }

  // Get authentication headers
  const authHeader = req.headers['x-tool-auth'];
  const timestamp = req.headers['x-tool-timestamp'];
  const signature = req.headers['x-tool-signature'];

  // Check if all required headers are present
  if (!authHeader || !timestamp || !signature) {
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Missing authentication headers' 
    });
  }

  // Verify timestamp (prevent replay attacks - 5 minute window)
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (isNaN(requestTime) || timeDiff > 5 * 60 * 1000) {
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Invalid or expired timestamp' 
    });
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', TOOL_SECRET)
    .update(`${authHeader}:${timestamp}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Invalid signature' 
    });
  }

  // Authentication successful
  res.status(200).json({ 
    authenticated: true,
    origin: ALLOWED_ORIGIN
  });
}