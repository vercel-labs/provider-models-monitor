# provider-models-monitor

Monitors `/models` endpoints for changes and notifies other repositories

## Setup

Place the API keys in a `.env` file:
```
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
```

## Usage

The scripts are invoked regularly via a GitHub workflow.

To run them manually in your environment, use `bun run`:
```bash
bun run src/scripts/anthropic.ts
bun run src/scripts/google.ts
bun run src/scripts/openai.ts
bun run src/scripts/xai.ts
```
