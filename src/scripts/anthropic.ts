import {
  computeResult,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const response = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  },
});

if (!response.ok) {
  throw new Error(
    `Anthropic API error: ${response.status} ${response.statusText}`
  );
}

const data = (await response.json()) as { data: { id: string }[] };
const models: string[] = data.data.map((m) => m.id);

const existing = await readExistingModels("anthropic");
const result = computeResult(existing, models);
const latestRun = await writeOutputFiles({
  provider: "anthropic",
  fetched: models,
  result,
});

console.log(JSON.stringify(latestRun, null, 2));
