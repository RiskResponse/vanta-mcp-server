import {
  getVantaTests,
  getVantaTestEntities,
  sanitizeId,
} from "../data/vantaClient.js";

interface SuggestRemediationArgs {
  testId: string;
}

/**
 * Gather test details + failing entities and return them together
 * so the LLM can generate remediation guidance from real data.
 *
 * Previously this called a non-existent /v1/tests/{id}/remediation endpoint.
 * Now it composes available API data and lets the AI do the reasoning.
 */
export async function suggestRemediation(args: SuggestRemediationArgs) {
  try {
    const safeId = sanitizeId(args.testId, "testId");

    const [testsResponse, entitiesResponse] = await Promise.all([
      getVantaTests(),
      getVantaTestEntities(safeId, { pageSize: 10 }),
    ]);

    const tests = testsResponse.results?.data ?? [];
    const test = (tests as Array<{ id: string }>).find((t) => t.id === safeId);

    if (!test) {
      return {
        content: [{ type: "text" as const, text: `Test not found: ${safeId}` }],
        isError: true,
      };
    }

    const entities = entitiesResponse.results?.data ?? [];

    const context = {
      test,
      failingEntities: entities,
      note: "Use the test details and failing entities above to suggest specific remediation steps.",
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error building remediation context: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
