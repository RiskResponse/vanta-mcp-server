import { describe, it, expect } from "vitest";
import { sanitizeId } from "../data/vantaClient.js";

describe("sanitizeId", () => {
  it("accepts simple alphanumeric IDs", () => {
    expect(sanitizeId("abc123", "testId")).toBe("abc123");
  });

  it("accepts hyphens and underscores", () => {
    expect(sanitizeId("aws-ec2-ebs_encryption", "testId")).toBe(
      "aws-ec2-ebs_encryption",
    );
  });

  it("trims whitespace", () => {
    expect(sanitizeId("  test-123  ", "testId")).toBe("test-123");
  });

  it("rejects empty string", () => {
    expect(() => sanitizeId("", "testId")).toThrow("testId must not be empty");
  });

  it("rejects whitespace-only string", () => {
    expect(() => sanitizeId("   ", "testId")).toThrow(
      "testId must not be empty",
    );
  });

  it("rejects path traversal", () => {
    expect(() => sanitizeId("../etc/passwd", "testId")).toThrow(
      "invalid characters",
    );
  });

  it("rejects URL-encoded characters", () => {
    expect(() => sanitizeId("test%2Fid", "testId")).toThrow(
      "invalid characters",
    );
  });

  it("rejects query string injection", () => {
    expect(() => sanitizeId("test?key=val", "testId")).toThrow(
      "invalid characters",
    );
  });

  it("rejects hash injection", () => {
    expect(() => sanitizeId("test#fragment", "testId")).toThrow(
      "invalid characters",
    );
  });

  it("rejects newlines", () => {
    expect(() => sanitizeId("test\nid", "testId")).toThrow(
      "invalid characters",
    );
  });

  it("uses the provided label in error messages", () => {
    expect(() => sanitizeId("", "myField")).toThrow(
      "myField must not be empty",
    );
    expect(() => sanitizeId("bad/id", "myField")).toThrow(
      "myField contains invalid characters",
    );
  });
});
