import { getVantaResources } from "../data/vantaClient.js";

interface ListAffectedAssetsArgs {
  testId: string;
}

export async function listAffectedAssets(args: ListAffectedAssetsArgs) {
  try {
    const response = await getVantaResources(args.testId);
    const assets = response.results?.data || response.data || response;

    if (!assets || assets.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No affected assets found for test: ${args.testId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(assets, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching assets: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
