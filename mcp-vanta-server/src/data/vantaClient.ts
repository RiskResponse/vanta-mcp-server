/**
 * Vanta API client with OAuth authentication
 *
 * Endpoints aligned with https://developer.vanta.com/docs/query-test-results-and-filter-for-failing-resources
 */

import { RateLimiter } from "../rateLimit.js";

const VANTA_API_BASE = "https://api.vanta.com";
const FETCH_TIMEOUT_MS = 30_000;

let accessToken: string | null = null;
let tokenExpiry: number = 0;

// 60 requests per 60 seconds — well within typical API limits
const rateLimiter = new RateLimiter(60, 60_000);

// --- Logging ---

function log(message: string): void {
  const ts = new Date().toISOString();
  console.error(`[vanta-mcp ${ts}] ${message}`);
}

// --- Input sanitization ---

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function sanitizeId(id: string, label: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty`);
  }
  if (!SAFE_ID_PATTERN.test(trimmed)) {
    throw new Error(`${label} contains invalid characters`);
  }
  return trimmed;
}

// --- Pagination types ---

export interface PageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
}

export interface PaginatedResponse<T> {
  results: {
    data: T[];
    pageInfo: PageInfo;
  };
}

export interface PaginationOptions {
  pageSize?: number;
  pageCursor?: string;
}

// --- OAuth ---

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = process.env.VANTA_CLIENT_ID;
  const clientSecret = process.env.VANTA_CLIENT_SECRET;
  const scopes = process.env.VANTA_SCOPES || "vanta-api.all:read";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing VANTA_CLIENT_ID or VANTA_CLIENT_SECRET environment variables",
    );
  }

  log("Refreshing OAuth token");

  const response = await fetch(`${VANTA_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const status = response.status;
    log(`OAuth token refresh failed (HTTP ${status})`);
    throw new Error(`Vanta OAuth failed (HTTP ${status})`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

  log("OAuth token refreshed successfully");
  return accessToken!;
}

// --- HTTP layer ---

async function vantaFetch<T>(endpoint: string): Promise<T> {
  rateLimiter.check();

  const token = await getAccessToken();

  log(`API request: GET ${endpoint}`);

  const response = await fetch(`${VANTA_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const status = response.status;
    log(`API error: GET ${endpoint} -> HTTP ${status}`);
    throw new Error(`Vanta API error (HTTP ${status})`);
  }

  log(`API success: GET ${endpoint}`);
  return response.json() as Promise<T>;
}

// --- Vanta API v1 ---

export interface TestFilters {
  statusFilter?:
    | "OK"
    | "DEACTIVATED"
    | "NEEDS_ATTENTION"
    | "IN_PROGRESS"
    | "INVALID"
    | "NOT_APPLICABLE";
  categoryFilter?: string;
  frameworkFilter?: string;
  controlFilter?: string;
  ownerFilter?: string;
}

export async function getVantaTests(
  filters?: TestFilters,
  pagination?: PaginationOptions,
): Promise<PaginatedResponse<unknown>> {
  const params = new URLSearchParams();

  if (filters?.statusFilter)
    params.append("statusFilter", filters.statusFilter);
  if (filters?.categoryFilter)
    params.append("categoryFilter", filters.categoryFilter);
  if (filters?.frameworkFilter)
    params.append("frameworkFilter", filters.frameworkFilter);
  if (filters?.controlFilter)
    params.append("controlFilter", filters.controlFilter);
  if (filters?.ownerFilter) params.append("ownerFilter", filters.ownerFilter);

  params.append("pageSize", String(pagination?.pageSize ?? 100));
  if (pagination?.pageCursor)
    params.append("pageCursor", pagination.pageCursor);

  return vantaFetch<PaginatedResponse<unknown>>(`/v1/tests?${params}`);
}

/**
 * Fetch entities (assets) failing a specific test.
 * Endpoint: GET /v1/tests/{testId}/entities
 */
export async function getVantaTestEntities(
  testId: string,
  pagination?: PaginationOptions,
): Promise<PaginatedResponse<unknown>> {
  const safeId = sanitizeId(testId, "testId");
  const params = new URLSearchParams();
  params.append("entityStatus", "FAILING");
  params.append("pageSize", String(pagination?.pageSize ?? 100));
  if (pagination?.pageCursor)
    params.append("pageCursor", pagination.pageCursor);

  return vantaFetch<PaginatedResponse<unknown>>(
    `/v1/tests/${safeId}/entities?${params}`,
  );
}
