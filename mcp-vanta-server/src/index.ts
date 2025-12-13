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

const server = new Server(
  {
    name: "vanta-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_failing_tests",
        description:
          "List all failing compliance tests from Vanta. Returns an array of test summaries including ID, name, severity, and category.",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              description:
                "Filter by environment (e.g., 'staging', 'production'). Optional.",
            },
            severity: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
              description: "Filter by severity level. Optional.",
            },
          },
        },
      },
      {
        name: "get_test_details",
        description:
          "Get detailed information for a specific compliance test, including evidence, affected resource count, and full description.",
        inputSchema: {
          type: "object",
          properties: {
            testId: {
              type: "string",
              description: "The unique identifier of the test (e.g., 'aws-ec2-ebs-encryption').",
            },
          },
          required: ["testId"],
        },
      },
      {
        name: "list_affected_assets",
        description:
          "List all resources/assets that are failing a specific compliance test. Returns asset IDs, types, and corresponding Terraform resource paths.",
        inputSchema: {
          type: "object",
          properties: {
            testId: {
              type: "string",
              description: "The unique identifier of the test to get affected assets for.",
            },
          },
          required: ["testId"],
        },
      },
      {
        name: "suggest_remediation",
        description:
          "Get remediation guidance for a failing test, including step-by-step instructions and Terraform code snippets to fix the issue.",
        inputSchema: {
          type: "object",
          properties: {
            testId: {
              type: "string",
              description: "The unique identifier of the test to get remediation for.",
            },
          },
          required: ["testId"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "list_failing_tests":
      return listFailingTests(args as { environment?: string; severity?: string });

    case "get_test_details":
      return getTestDetails(args as { testId: string });

    case "list_affected_assets":
      return listAffectedAssets(args as { testId: string });

    case "suggest_remediation":
      return suggestRemediation(args as { testId: string });

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vanta MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

