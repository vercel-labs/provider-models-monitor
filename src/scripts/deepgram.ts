import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "../lib/provider-models";

const models = await fetchModelIDs({
  url: "https://api.deepgram.com/v1/models",
  parseResponse: (data) => {
    const { stt, tts } = data as {
      stt: { canonical_name: string }[];
      tts: { canonical_name: string }[];
    };
    return [
      ...new Set([
        ...stt.map((m) => m.canonical_name),
        ...tts.map((m) => m.canonical_name),
      ]),
    ];
  },
});

const existing = await readExistingModels("deepgram");
const result = computeResult(existing, models);

if (result) {
  const latestRun = await writeOutputFiles({
    provider: "deepgram",
    fetched: models,
    result,
  });
  console.log(JSON.stringify(latestRun, null, 2));
} else {
  console.log("No provider model changes detected for Deepgram.");
}
