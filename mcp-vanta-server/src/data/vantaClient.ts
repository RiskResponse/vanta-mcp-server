/**
 * Real Vanta API client with OAuth authentication
 */

const VANTA_API_BASE = 'https://api.vanta.com';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get OAuth access token, refreshing if expired
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = process.env.VANTA_CLIENT_ID;
  const clientSecret = process.env.VANTA_CLIENT_SECRET;
  const scopes = process.env.VANTA_SCOPES || 'vanta-api.all:read';

  if (!clientId || !clientSecret) {
    throw new Error('Missing VANTA_CLIENT_ID or VANTA_CLIENT_SECRET environment variables');
  }

  const response = await fetch(`${VANTA_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vanta OAuth failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  // Set expiry with 1 minute buffer
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  
  return accessToken!;
}

/**
 * Make authenticated request to Vanta API
 */
export async function vantaFetch<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();
  
  const response = await fetch(`${VANTA_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vanta API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch failing tests from Vanta API
 */
export async function getVantaTests(filters?: { environment?: string; severity?: string }) {
  // Build query params
  const params = new URLSearchParams();
  params.append('status', 'failing');
  if (filters?.environment) params.append('environment', filters.environment);
  if (filters?.severity) params.append('severity', filters.severity);
  
  return vantaFetch<any>(`/v1/tests?${params}`);
}

/**
 * Fetch test details from Vanta API
 */
export async function getVantaTestDetails(testId: string) {
  return vantaFetch<any>(`/v1/tests/${testId}`);
}

/**
 * Fetch resources/assets from Vanta API
 */
export async function getVantaResources(testId?: string) {
  const params = new URLSearchParams();
  if (testId) params.append('testId', testId);
  
  return vantaFetch<any>(`/v1/resources?${params}`);
}

/**
 * Fetch remediation guidance (if available via API)
 * Note: This may need adjustment based on actual Vanta API endpoints
 */
export async function getVantaRemediation(testId: string) {
  return vantaFetch<any>(`/v1/tests/${testId}/remediation`);
}

