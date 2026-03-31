import { getVantaTestEntities } from "../data/vantaClient.js";

interface ListAffectedAssetsArgs {
  testId: string;
  pageSize?: number;
  pageCursor?: string;
}

export async function listAffectedAssets(args: ListAffectedAssetsArgs) {
  try {
    const response = await getVantaTestEntities(args.testId, {
      pageSize: args.pageSize,
      pageCursor: args.pageCursor,
    });

    const entities = response.results?.data ?? [];
    const pageInfo = response.results?.pageInfo;

    if (entities.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No failing entities found for test: ${args.testId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ entities, pageInfo }, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        { type: "text" as const, text: `Error fetching entities: ${message}` },
      ],
      isError: true,
    };
  }
}
