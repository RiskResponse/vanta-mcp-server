#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { listFailingTests } from "./tools/listFailingTests.js";
import { getTestDetails } from "./tools/getTestDetails.js";
import { listAffectedAssets } from "./tools/listAffectedAssets.js";
import { suggestRemediation } from "./tools/suggestRemediation.js";
import {
  ListFailingTestsSchema,
  GetTestDetailsSchema,
  ListAffectedAssetsSchema,
  SuggestRemediationSchema,
} from "./validation.js";

const server = new Server(
  {
    name: "vanta-mcp-server",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_failing_tests",
        description:
          "List compliance tests that need attention in Vanta. Returns test summaries with pagination. Defaults to showing tests with status NEEDS_ATTENTION.",
        inputSchema: {
          type: "object",
          properties: {
            categoryFilter: {
              type: "string",
              description:
                "Filter by category (e.g., 'INFRASTRUCTURE', 'ACCOUNTS_ACCESS', 'PEOPLE', 'VENDORS').",
            },
            frameworkFilter: {
              type: "string",
              description: "Filter by compliance framework.",
            },
            pageSize: {
              type: "number",
              description: "Number of results per page (default: 100).",
            },
            pageCursor: {
              type: "string",
              description: "Cursor for fetching the next page of results.",
            },
          },
        },
        annotations: {
          title: "List Failing Tests",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_test_details",
        description:
          "Get detailed information for a specific compliance test by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            testId: {
              type: "string",
              description: "The unique identifier of the test.",
            },
          },
          required: ["testId"],
        },
        annotations: {
          title: "Get Test Details",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "list_affected_assets",
        description:
          "List entities (assets/resources) that are failing a specific compliance test. Returns entity details with pagination.",
        inputSchema: {
          type: "object",
          properties: {
            testId: {
              type: "string",
              description: "The unique identifier of the test.",
            },
            pageSize: {
              type: "number",
              description: "Number of results per page (default: 100).",
            },
            pageCursor: {
              type: "string",
              description: "Cursor for fetching the next page of results.",
            },
          },
          required: ["testId"],
        },
        annotations: {
          title: "List Affected Assets",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "suggest_remediation",
        description:
          "Get test details and failing entities for a specific test, providing context for generating remediation guidance.",
        inputSchema: {
          type: "object",
          properties: {
            testId: {
              type: "string",
              description:
                "The unique identifier of the test to get remediation context for.",
            },
          },
          required: ["testId"],
        },
        annotations: {
          title: "Suggest Remediation",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const ts = new Date().toISOString();
  console.error(`[vanta-mcp ${ts}] Tool called: ${name}`);

  try {
    switch (name) {
      case "list_failing_tests":
        return listFailingTests(ListFailingTestsSchema.parse(args ?? {}));

      case "get_test_details":
        return getTestDetails(GetTestDetailsSchema.parse(args));

      case "list_affected_assets":
        return listAffectedAssets(ListAffectedAssetsSchema.parse(args));

      case "suggest_remediation":
        return suggestRemediation(SuggestRemediationSchema.parse(args));

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Invalid arguments: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vanta MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
