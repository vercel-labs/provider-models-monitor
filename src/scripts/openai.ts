import {
  computeResult,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

const response = await fetch("https://api.openai.com/v1/models", {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

if (!response.ok) {
  throw new Error(
    `OpenAI API error: ${response.status} ${response.statusText}`
  );
}

const data = (await response.json()) as { data: { id: string }[] };
const models: string[] = data.data.map((m) => m.id);

const existing = await readExistingModels("openai");
const result = computeResult(existing, models);
const latestRun = await writeOutputFiles({
  provider: "openai",
  fetched: models,
  result,
});

console.log(JSON.stringify(latestRun, null, 2));
