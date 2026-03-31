import { getVantaTests, sanitizeId } from "../data/vantaClient.js";

interface GetTestDetailsArgs {
  testId: string;
}

export async function getTestDetails(args: GetTestDetailsArgs) {
  try {
    const safeId = sanitizeId(args.testId, "testId");

    // Vanta API doesn't expose a single-test GET endpoint.
    // Fetch the tests list and find the matching one.
    // TODO: If Vanta adds GET /v1/tests/{id}, switch to that.
    const response = await getVantaTests();
    const tests = response.results?.data ?? [];
    const test = (tests as Array<{ id: string }>).find((t) => t.id === safeId);

    if (!test) {
      return {
        content: [{ type: "text" as const, text: `Test not found: ${safeId}` }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(test, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error fetching test details: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
