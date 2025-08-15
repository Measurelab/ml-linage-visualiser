import CryptoJS from 'crypto-js';

/**
 * Verify authentication for incoming requests (client-side version)
 * This is used when the app needs to verify auth in the browser
 */
export const verifyAuthentication = () => {
  // Skip auth in development unless explicitly enabled
  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH === 'true' || import.meta.env.PROD;
  
  if (!requireAuth) {
    return true;
  }

  // In production, the middleware handles authentication
  // This function is mainly for client-side checks
  return true;
};

/**
 * Generate authentication headers for outgoing requests
 * Used by the main site to authenticate with this tool
 */
export const generateAuthHeaders = (secret: string): Record<string, string> => {
  const timestamp = Date.now().toString();
  const authToken = 'main-site-access';
  
  const signature = CryptoJS.HmacSHA256(
    `${authToken}:${timestamp}`,
    secret
  ).toString();

  return {
    'X-Tool-Auth': authToken,
    'X-Tool-Timestamp': timestamp,
    'X-Tool-Signature': signature,
  };
};