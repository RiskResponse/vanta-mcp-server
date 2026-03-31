import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

function sendJsonRpc(
  proc: ReturnType<typeof spawn>,
  method: string,
  id: number,
  params?: object,
): void {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  proc.stdin!.write(`${msg}\n`);
}

function collectStdout(
  proc: ReturnType<typeof spawn>,
  timeoutMs = 5000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    const timer = setTimeout(
      () => reject(new Error("Timeout waiting for server response")),
      timeoutMs,
    );
    proc.stdout!.on("data", (chunk: Buffer) => {
      data += chunk.toString();
      // Look for complete JSON-RPC responses (we expect at least 2: initialize + tools/list)
      const lines = data.split("\n").filter((l) => l.trim());
      if (lines.length >= 2) {
        clearTimeout(timer);
        resolve(data);
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe("MCP smoke test", () => {
  it("starts and responds to tools/list with valid tool definitions", async () => {
    const serverPath = resolve(import.meta.dirname, "../../dist/index.js");

    const proc = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // Provide dummy credentials — the server should start without
        // actually calling Vanta since we only list tools.
        VANTA_CLIENT_ID: "test-id",
        VANTA_CLIENT_SECRET: "test-secret",
      },
    });

    try {
      // Step 1: Initialize
      sendJsonRpc(proc, "initialize", 1, {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "smoke-test", version: "1.0.0" },
      });

      // Step 2: List tools
      sendJsonRpc(proc, "tools/list", 2);

      const output = await collectStdout(proc);
      const responses = output
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));

      // Validate initialize response
      const initResponse = responses.find((r: { id: number }) => r.id === 1);
      expect(initResponse).toBeDefined();
      expect(initResponse.result.serverInfo.name).toBe("vanta-mcp-server");

      // Validate tools/list response
      const toolsResponse = responses.find((r: { id: number }) => r.id === 2);
      expect(toolsResponse).toBeDefined();
      expect(toolsResponse.result.tools).toBeInstanceOf(Array);
      expect(toolsResponse.result.tools.length).toBe(4);

      const toolNames = toolsResponse.result.tools
        .map((t: { name: string }) => t.name)
        .sort();
      expect(toolNames).toEqual([
        "get_test_details",
        "list_affected_assets",
        "list_failing_tests",
        "suggest_remediation",
      ]);

      // Validate all tools have annotations
      for (const tool of toolsResponse.result.tools) {
        expect(tool.annotations).toBeDefined();
        expect(tool.annotations.readOnlyHint).toBe(true);
        expect(tool.annotations.destructiveHint).toBe(false);
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    } finally {
      proc.kill();
    }
  }, 10000);
});
