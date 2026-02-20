import {
  computeResult,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const MODELS_PREFIX_RE = /^models\//;

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("GOOGLE_API_KEY is not set");
}

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${apiKey}`
);

if (!response.ok) {
  throw new Error(
    `Google API error: ${response.status} ${response.statusText}`
  );
}

const data = (await response.json()) as { models: { name: string }[] };
const models: string[] = data.models.map((m) =>
  m.name.replace(MODELS_PREFIX_RE, "")
);

const existing = await readExistingModels("google");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "google",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Google.");
}
