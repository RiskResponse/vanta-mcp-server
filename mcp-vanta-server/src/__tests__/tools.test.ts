import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFailingTests } from "../tools/listFailingTests.js";
import { getTestDetails } from "../tools/getTestDetails.js";
import { listAffectedAssets } from "../tools/listAffectedAssets.js";
import { suggestRemediation } from "../tools/suggestRemediation.js";

// Mock the vantaClient module
vi.mock("../data/vantaClient.js", () => ({
  sanitizeId: (id: string, label: string) => {
    if (!id.trim()) throw new Error(`${label} must not be empty`);
    if (!/^[a-zA-Z0-9_-]+$/.test(id.trim()))
      throw new Error(`${label} contains invalid characters`);
    return id.trim();
  },
  getVantaTests: vi.fn(),
  getVantaTestEntities: vi.fn(),
}));

import { getVantaTests, getVantaTestEntities } from "../data/vantaClient.js";
const mockGetTests = vi.mocked(getVantaTests);
const mockGetEntities = vi.mocked(getVantaTestEntities);

const fakePaginatedTests = {
  results: {
    data: [
      {
        id: "test-1",
        name: "EBS Encryption",
        status: "NEEDS_ATTENTION",
        category: "INFRASTRUCTURE",
      },
      {
        id: "test-2",
        name: "MFA Enabled",
        status: "NEEDS_ATTENTION",
        category: "ACCOUNTS_ACCESS",
      },
    ],
    pageInfo: {
      endCursor: "cur1",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "cur0",
    },
  },
};

const fakePaginatedEntities = {
  results: {
    data: [{ id: "ent-1", displayName: "i-abc123", entityStatus: "FAILING" }],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTests.mockResolvedValue(fakePaginatedTests);
  mockGetEntities.mockResolvedValue(fakePaginatedEntities);
});

describe("listFailingTests", () => {
  it("returns test data with pagination info", async () => {
    const result = await listFailingTests({});
    expect(result.isError).toBeUndefined();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tests).toHaveLength(2);
    expect(parsed.pageInfo.hasNextPage).toBe(false);
  });

  it("passes filters to API", async () => {
    await listFailingTests({ categoryFilter: "INFRASTRUCTURE" });
    expect(mockGetTests).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryFilter: "INFRASTRUCTURE",
        statusFilter: "NEEDS_ATTENTION",
      }),
      expect.any(Object),
    );
  });

  it("returns isError on API failure", async () => {
    mockGetTests.mockRejectedValue(new Error("Vanta API error (HTTP 500)"));
    const result = await listFailingTests({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("HTTP 500");
  });
});

describe("getTestDetails", () => {
  it("finds and returns a matching test", async () => {
    const result = await getTestDetails({ testId: "test-1" });
    expect(result.isError).toBeUndefined();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("test-1");
    expect(parsed.name).toBe("EBS Encryption");
  });

  it("returns isError when test not found", async () => {
    const result = await getTestDetails({ testId: "nonexistent" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Test not found");
  });
});

describe("listAffectedAssets", () => {
  it("returns entity data", async () => {
    const result = await listAffectedAssets({ testId: "test-1" });
    expect(result.isError).toBeUndefined();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.entities).toHaveLength(1);
    expect(parsed.entities[0].displayName).toBe("i-abc123");
  });

  it("returns message when no entities found", async () => {
    mockGetEntities.mockResolvedValue({
      results: {
        data: [],
        pageInfo: {
          endCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
        },
      },
    });
    const result = await listAffectedAssets({ testId: "test-1" });
    expect(result.content[0].text).toContain("No failing entities found");
  });
});

describe("suggestRemediation", () => {
  it("returns combined test + entity context", async () => {
    const result = await suggestRemediation({ testId: "test-1" });
    expect(result.isError).toBeUndefined();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.test.id).toBe("test-1");
    expect(parsed.failingEntities).toHaveLength(1);
    expect(parsed.note).toBeDefined();
  });

  it("returns isError when test not found", async () => {
    const result = await suggestRemediation({ testId: "nonexistent" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Test not found");
  });
});
