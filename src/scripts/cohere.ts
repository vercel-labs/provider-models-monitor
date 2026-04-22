import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.COHERE_API_KEY;
if (!apiKey) {
  throw new Error("COHERE_API_KEY is not set");
}

const models = await fetchModelIDs({
  url: "https://api.cohere.com/v1/models?page_size=1000",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  parseResponse: (data) => {
    const { models } = data as { models: { name: string }[] };
    return models.map((m) => m.name);
  },
});

const existing = await readExistingModels("cohere");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "cohere",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Cohere.");
}
