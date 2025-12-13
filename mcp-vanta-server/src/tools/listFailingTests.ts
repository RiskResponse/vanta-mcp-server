import { getVantaTests } from "../data/vantaClient.js";

interface ListFailingTestsArgs {
  environment?: string;
  severity?: string;
}

export async function listFailingTests(args: ListFailingTestsArgs) {
  try {
    const response = await getVantaTests(args);
    const tests = response.results?.data || response.data || response;

    const summary = tests.map((test: any) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      lastTestRunDate: test.lastTestRunDate,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching tests: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
