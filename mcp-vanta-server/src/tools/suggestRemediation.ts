import { getVantaRemediation } from "../data/vantaClient.js";

interface SuggestRemediationArgs {
  testId: string;
}

export async function suggestRemediation(args: SuggestRemediationArgs) {
  try {
    const remediation = await getVantaRemediation(args.testId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(remediation, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching remediation: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
