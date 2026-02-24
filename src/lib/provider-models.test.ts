import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
  computeResult,
  fetchModelIDs,
  readExistingModels,
  writeOutputFiles,
} from "./provider-models";

afterEach(() => {
  mock.restore();
});

describe("readExistingModels", () => {
  test("returns null when file does not exist", async () => {
    spyOn(Bun, "file").mockReturnValue({
      exists: () => Promise.resolve(false),
    } as ReturnType<typeof Bun.file>);

    expect(await readExistingModels("anthropic")).toBeNull();
  });

  test("returns parsed JSON when file exists", async () => {
    const models = ["model-a", "model-b"];
    spyOn(Bun, "file").mockReturnValue({
      exists: () => Promise.resolve(true),
      json: () => Promise.resolve(models),
    } as ReturnType<typeof Bun.file>);

    expect(await readExistingModels("anthropic")).toEqual(models);
  });

  test("reads from correct path", async () => {
    const fileSpy = spyOn(Bun, "file").mockReturnValue({
      exists: () => Promise.resolve(false),
    } as ReturnType<typeof Bun.file>);

    await readExistingModels("openai");

    expect(fileSpy).toHaveBeenCalledWith("provider-models/openai.json");
  });
});

describe("computeResult", () => {
  test("returns new_provider result when no existing models", () => {
    const fetched = ["model-a", "model-b"];
    expect(computeResult(null, fetched)).toEqual({
      resultType: "new_provider",
      newModelIDs: fetched,
      obsoleteModelIDs: [],
    });
  });

  test("returns new_provider with empty obsoleteModelIDs even when fetched is empty", () => {
    expect(computeResult(null, [])).toEqual({
      resultType: "new_provider",
      newModelIDs: [],
      obsoleteModelIDs: [],
    });
  });

  test("returns null when no changes", () => {
    expect(
      computeResult(["model-a", "model-b"], ["model-a", "model-b"])
    ).toBeNull();
  });

  test("returns null when same models in different order", () => {
    expect(
      computeResult(["model-a", "model-b"], ["model-b", "model-a"])
    ).toBeNull();
  });

  test("detects new models", () => {
    expect(computeResult(["model-a"], ["model-a", "model-b"])).toEqual({
      resultType: "provider_models_diff",
      newModelIDs: ["model-b"],
      obsoleteModelIDs: [],
    });
  });

  test("detects obsolete models", () => {
    expect(computeResult(["model-a", "model-b"], ["model-a"])).toEqual({
      resultType: "provider_models_diff",
      newModelIDs: [],
      obsoleteModelIDs: ["model-b"],
    });
  });

  test("detects both new and obsolete models simultaneously", () => {
    expect(
      computeResult(["model-a", "model-b"], ["model-b", "model-c"])
    ).toEqual({
      resultType: "provider_models_diff",
      newModelIDs: ["model-c"],
      obsoleteModelIDs: ["model-a"],
    });
  });
});

describe("writeOutputFiles", () => {
  test("writes models sorted alphabetically", async () => {
    const writeSpy = spyOn(Bun, "write").mockResolvedValue(
      0 as number & { arrayBuffer: ArrayBuffer }
    );

    await writeOutputFiles({
      provider: "anthropic",
      fetched: ["model-c", "model-a", "model-b"],
      result: {
        resultType: "new_provider",
        newModelIDs: ["model-c", "model-a", "model-b"],
        obsoleteModelIDs: [],
      },
    });

    expect(writeSpy).toHaveBeenCalledWith(
      "provider-models/anthropic.json",
      `${JSON.stringify(["model-a", "model-b", "model-c"], null, 2)}\n`
    );
  });

  test("writes latest run file with provider and result metadata", async () => {
    const writeSpy = spyOn(Bun, "write").mockResolvedValue(
      0 as number & { arrayBuffer: ArrayBuffer }
    );

    await writeOutputFiles({
      provider: "openai",
      fetched: ["gpt-4"],
      result: {
        resultType: "provider_models_diff",
        newModelIDs: ["gpt-4"],
        obsoleteModelIDs: ["gpt-3"],
      },
    });

    const [path, content] = writeSpy.mock.calls[1] as unknown as [
      string,
      string,
    ];
    expect(path).toBe("provider-models/openai-latest-run.json");

    const latestRun = JSON.parse(content);
    expect(latestRun.provider).toBe("openai");
    expect(latestRun.resultType).toBe("provider_models_diff");
    expect(latestRun.newModelIDs).toEqual(["gpt-4"]);
    expect(latestRun.obsoleteModelIDs).toEqual(["gpt-3"]);
  });

  test("returns LatestRun with timestamp", async () => {
    spyOn(Bun, "write").mockResolvedValue(
      0 as number & { arrayBuffer: ArrayBuffer }
    );

    const before = new Date().toISOString();
    const latestRun = await writeOutputFiles({
      provider: "xai",
      fetched: ["grok-1"],
      result: {
        resultType: "new_provider",
        newModelIDs: ["grok-1"],
        obsoleteModelIDs: [],
      },
    });
    const after = new Date().toISOString();

    expect(latestRun.provider).toBe("xai");
    expect(latestRun.timestamp >= before).toBeTrue();
    expect(latestRun.timestamp <= after).toBeTrue();
  });

  test("does not mutate fetched array order when sorting", async () => {
    spyOn(Bun, "write").mockResolvedValue(
      0 as number & { arrayBuffer: ArrayBuffer }
    );

    const fetched = ["model-c", "model-a", "model-b"];
    await writeOutputFiles({
      provider: "google",
      fetched,
      result: {
        resultType: "new_provider",
        newModelIDs: fetched,
        obsoleteModelIDs: [],
      },
    });

    expect(fetched).toEqual(["model-c", "model-a", "model-b"]);
  });
});

const MODELS_PREFIX_RE = /^models\//;

const providerCases: {
  provider: string;
  url: string;
  headers?: Record<string, string>;
  mockResponse: unknown;
  parseResponse: (data: unknown) => string[];
  expected: string[];
}[] = [
  {
    provider: "Anthropic",
    url: "https://api.anthropic.com/v1/models?limit=1000",
    headers: { "x-api-key": "test-key", "anthropic-version": "2023-06-01" },
    mockResponse: {
      data: [
        { id: "claude-sonnet-4-20250514" },
        { id: "claude-haiku-4-20250414" },
      ],
    },
    parseResponse: (data: unknown) => {
      const { data: models } = data as { data: { id: string }[] };
      return models.map((m) => m.id);
    },
    expected: ["claude-sonnet-4-20250514", "claude-haiku-4-20250414"],
  },
  {
    provider: "Google",
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=test-key",
    mockResponse: {
      models: [
        { name: "models/gemini-2.0-flash" },
        { name: "models/gemini-1.5-pro" },
      ],
    },
    parseResponse: (data: unknown) => {
      const { models } = data as { models: { name: string }[] };
      return models.map((m) => m.name.replace(MODELS_PREFIX_RE, ""));
    },
    expected: ["gemini-2.0-flash", "gemini-1.5-pro"],
  },
  {
    provider: "OpenAI",
    url: "https://api.openai.com/v1/models",
    headers: { Authorization: "Bearer test-key" },
    mockResponse: {
      data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }, { id: "o3-mini" }],
    },
    parseResponse: (data: unknown) => {
      const { data: models } = data as { data: { id: string }[] };
      return models.map((m) => m.id);
    },
    expected: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
  },
  {
    provider: "xAI",
    url: "https://api.x.ai/v1/models",
    headers: { Authorization: "Bearer test-key" },
    mockResponse: {
      data: [{ id: "grok-2" }, { id: "grok-3" }],
    },
    parseResponse: (data: unknown) => {
      const { data: models } = data as { data: { id: string }[] };
      return models.map((m) => m.id);
    },
    expected: ["grok-2", "grok-3"],
  },
];

describe("fetchModelIDs", () => {
  for (const tc of providerCases) {
    test(`parses ${tc.provider} response into model IDs`, async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(tc.mockResponse), { status: 200 })
      );

      const models = await fetchModelIDs({
        url: tc.url,
        headers: tc.headers,
        parseResponse: tc.parseResponse,
      });

      expect(models).toEqual(tc.expected);
      expect(fetchSpy).toHaveBeenCalledWith(
        tc.url,
        tc.headers ? { headers: tc.headers } : undefined
      );
    });
  }

  test("throws on non-ok response", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
    );

    await expect(
      fetchModelIDs({
        url: "https://api.example.com/models",
        parseResponse: () => [],
      })
    ).rejects.toThrow("API error: 401 Unauthorized");
  });

  test("passes no options when headers are omitted", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ models: [] }), { status: 200 })
    );

    await fetchModelIDs({
      url: "https://api.example.com/models",
      parseResponse: () => [],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/models",
      undefined
    );
  });
});
