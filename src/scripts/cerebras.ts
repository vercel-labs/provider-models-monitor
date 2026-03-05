import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.CEREBRAS_API_KEY;
if (!apiKey) {
  throw new Error("CEREBRAS_API_KEY is not set");
}

const models = await fetchModelIDs({
  url: "https://api.cerebras.ai/v1/models",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  parseResponse: (data) => {
    const { data: models } = data as { data: { id: string }[] };
    return models.map((m) => m.id);
  },
});

const existing = await readExistingModels("cerebras");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "cerebras",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Cerebras.");
}
