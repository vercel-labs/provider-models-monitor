import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const models = await fetchModelIDs({
  url: "https://api.anthropic.com/v1/models?limit=1000",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  },
  parseResponse: (data) => {
    const { data: models } = data as { data: { id: string }[] };
    return models.map((m) => m.id);
  },
});

const existing = await readExistingModels("anthropic");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "anthropic",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Anthropic.");
}
