import { describe, it, expect } from "vitest";
import {
  ListFailingTestsSchema,
  GetTestDetailsSchema,
  ListAffectedAssetsSchema,
  SuggestRemediationSchema,
} from "../validation.js";

describe("ListFailingTestsSchema", () => {
  it("accepts empty object", () => {
    expect(ListFailingTestsSchema.parse({})).toEqual({});
  });

  it("accepts valid filters", () => {
    const input = { categoryFilter: "INFRASTRUCTURE", frameworkFilter: "SOC2" };
    const result = ListFailingTestsSchema.parse(input);
    expect(result.categoryFilter).toBe("INFRASTRUCTURE");
    expect(result.frameworkFilter).toBe("SOC2");
  });

  it("accepts valid pagination", () => {
    const input = { pageSize: 50, pageCursor: "abc123" };
    const result = ListFailingTestsSchema.parse(input);
    expect(result.pageSize).toBe(50);
    expect(result.pageCursor).toBe("abc123");
  });

  it("rejects pageSize below 1", () => {
    expect(() => ListFailingTestsSchema.parse({ pageSize: 0 })).toThrow();
  });

  it("rejects pageSize above 500", () => {
    expect(() => ListFailingTestsSchema.parse({ pageSize: 501 })).toThrow();
  });

  it("rejects non-integer pageSize", () => {
    expect(() => ListFailingTestsSchema.parse({ pageSize: 1.5 })).toThrow();
  });
});

describe("GetTestDetailsSchema", () => {
  it("accepts valid testId", () => {
    const result = GetTestDetailsSchema.parse({
      testId: "aws-ec2-ebs-encryption",
    });
    expect(result.testId).toBe("aws-ec2-ebs-encryption");
  });

  it("accepts alphanumeric with underscores", () => {
    const result = GetTestDetailsSchema.parse({ testId: "test_123_abc" });
    expect(result.testId).toBe("test_123_abc");
  });

  it("rejects empty testId", () => {
    expect(() => GetTestDetailsSchema.parse({ testId: "" })).toThrow();
  });

  it("rejects testId with path traversal", () => {
    expect(() =>
      GetTestDetailsSchema.parse({ testId: "../etc/passwd" }),
    ).toThrow();
  });

  it("rejects testId with query injection", () => {
    expect(() =>
      GetTestDetailsSchema.parse({ testId: "test?admin=true" }),
    ).toThrow();
  });

  it("rejects testId with spaces", () => {
    expect(() => GetTestDetailsSchema.parse({ testId: "test id" })).toThrow();
  });

  it("rejects missing testId", () => {
    expect(() => GetTestDetailsSchema.parse({})).toThrow();
  });
});

describe("ListAffectedAssetsSchema", () => {
  it("accepts testId with optional pagination", () => {
    const result = ListAffectedAssetsSchema.parse({
      testId: "test-123",
      pageSize: 10,
    });
    expect(result.testId).toBe("test-123");
    expect(result.pageSize).toBe(10);
  });

  it("rejects without testId", () => {
    expect(() => ListAffectedAssetsSchema.parse({ pageSize: 10 })).toThrow();
  });
});

describe("SuggestRemediationSchema", () => {
  it("accepts valid testId", () => {
    const result = SuggestRemediationSchema.parse({ testId: "test-456" });
    expect(result.testId).toBe("test-456");
  });

  it("rejects testId with encoded characters", () => {
    expect(() =>
      SuggestRemediationSchema.parse({ testId: "test%2F456" }),
    ).toThrow();
  });
});
