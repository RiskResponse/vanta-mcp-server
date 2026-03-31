import { getVantaTests, type TestFilters } from "../data/vantaClient.js";

interface ListFailingTestsArgs {
  categoryFilter?: string;
  frameworkFilter?: string;
  pageSize?: number;
  pageCursor?: string;
}

export async function listFailingTests(args: ListFailingTestsArgs) {
  try {
    const filters: TestFilters = {
      statusFilter: "NEEDS_ATTENTION",
      categoryFilter: args.categoryFilter,
      frameworkFilter: args.frameworkFilter,
    };

    const response = await getVantaTests(filters, {
      pageSize: args.pageSize,
      pageCursor: args.pageCursor,
    });

    const tests = response.results?.data ?? [];
    const pageInfo = response.results?.pageInfo;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ tests, pageInfo }, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        { type: "text" as const, text: `Error fetching tests: ${message}` },
      ],
      isError: true,
    };
  }
}
