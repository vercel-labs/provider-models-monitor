interface RunResult {
  newModelIDs: string[];
  /*
   * obsoleteModelIDs will always be empty for "new_provider" resultType, but
   * keeping it simplifies consumption since you can just iterate over both
   * arrays without a check, regardless of the resultType.
   */
  obsoleteModelIDs: string[];
  resultType: "new_provider" | "provider_models_diff";
}

type LatestRun = RunResult & { provider: string; timestamp: string };

export async function readExistingModels(
  provider: string
): Promise<string[] | null> {
  const file = Bun.file(`provider-models/${provider}.json`);
  if (!(await file.exists())) {
    return null;
  }
  return file.json();
}

export function computeResult(
  existing: string[] | null,
  fetched: string[]
): RunResult | null {
  if (existing === null) {
    return {
      resultType: "new_provider",
      newModelIDs: fetched,
      obsoleteModelIDs: [],
    };
  }

  const existingSet = new Set(existing);
  const fetchedSet = new Set(fetched);

  const newModelIDs = fetched.filter((id) => !existingSet.has(id));
  const obsoleteModelIDs = existing.filter((id) => !fetchedSet.has(id));

  if (newModelIDs.length === 0 && obsoleteModelIDs.length === 0) {
    return null;
  }

  return { resultType: "provider_models_diff", newModelIDs, obsoleteModelIDs };
}

export async function writeOutputFiles(opts: {
  provider: string;
  fetched: string[];
  result: RunResult;
}): Promise<LatestRun> {
  const { provider, fetched, result } = opts;
  const sorted = [...fetched].sort();

  await Bun.write(
    `provider-models/${provider}.json`,
    JSON.stringify(sorted, null, 2)
  );

  const latestRun: LatestRun = {
    ...result,
    provider,
    timestamp: new Date().toISOString(),
  };
  await Bun.write(
    `provider-models/${provider}-latest-run.json`,
    JSON.stringify(latestRun, null, 2)
  );

  return latestRun;
}
