import {
  computeResult,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
  throw new Error("XAI_API_KEY is not set");
}

const response = await fetch("https://api.x.ai/v1/models", {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

if (!response.ok) {
  throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
}

const data = (await response.json()) as { data: { id: string }[] };
const models: string[] = data.data.map((m) => m.id);

const existing = await readExistingModels("xai");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "xai",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for xAI.");
}
