import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.MOONSHOTAI_API_KEY;
if (!apiKey) {
  throw new Error("MOONSHOTAI_API_KEY is not set");
}

const models = await fetchModelIDs({
  url: "https://api.moonshot.cn/v1/models",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  parseResponse: (data) => {
    const { data: models } = data as { data: { id: string }[] };
    return models.map((m) => m.id);
  },
});

const existing = await readExistingModels("moonshotai");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "moonshotai",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Moonshotai.");
}
