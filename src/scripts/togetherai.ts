import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.TOGETHERAI_API_KEY;
if (!apiKey) {
  throw new Error("TOGETHERAI_API_KEY is not set");
}

const models = await fetchModelIDs({
  url: "https://api.together.xyz/v1/models",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  parseResponse: (data) => {
    const models = data as { id: string }[];
    return models.map((m) => m.id);
  },
});

const existing = await readExistingModels("together");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "togetherai",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Together AI.");
}
