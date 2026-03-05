import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  throw new Error("ELEVENLABS_API_KEY is not set");
}

const models = await fetchModelIDs({
  url: "https://api.elevenlabs.io/v1/models",
  headers: {
    "xi-api-key": apiKey,
  },
  parseResponse: (data) => {
    const models = data as { model_id: string }[];
    return models.map((m) => m.model_id);
  },
});

const existing = await readExistingModels("elevenlabs");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "elevenlabs",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for ElevenLabs.");
}
