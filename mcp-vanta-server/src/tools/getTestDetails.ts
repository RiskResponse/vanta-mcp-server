import { getVantaTestDetails } from "../data/vantaClient.js";

interface GetTestDetailsArgs {
  testId: string;
}

export async function getTestDetails(args: GetTestDetailsArgs) {
  try {
    const test = await getVantaTestDetails(args.testId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(test, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching test details: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
