# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

MV Studio — a local Electron desktop app (Windows) that turns a song's lyrics + character reference photos into AI image-generation prompts for music-video pre-production. Two stages:

- **Step 1 服化道（Costume）** — analyse a character ref photo + lyrics + mood/elements → output **3 differentiated 服化道 concepts**, each with a dense 200–400 字 Chinese MJ-style `ai_image_prompt` that the user copies into Midjourney / 即梦 / Flux to generate a 定妆照 (locked-in look).
- **Step 2 分镜（Storyboard）** — take the chosen concept + uploaded 定妆照 → output a per-lyric-line storyboard list. Each row renders to one copy-pasteable line in a strict template:
  `景别角度:{shot}，{angle}，运镜视角:{movement}，{perspective}，{refs}，{audio}，【{scene_description}】，歌词:"{lyric}"`

The user is non-technical and runs the app by double-clicking the desktop shortcut (`start-mv.bat` → launches `npm run dev`). Treat "are the prompts copy-pasteable and correctly templated?" as the actual acceptance criterion — type-checks passing is not the same as the feature working.

## Commands

```bash
npm run dev          # electron-vite dev (vite on :5173 + Electron with DevTools detached)
npm run build        # type-check + bundle main/preload/renderer to out/
npm run package      # build + electron-builder NSIS installer → release/
npm run package:dir  # build + unpacked binary (faster, for smoke-testing)
```

There is no test suite, no linter, no formatter. `npm run build` is the only verification gate — run it after main/preload/shared changes.

## Critical: how dev reload works

**Vite HMR only reloads the renderer.** Any change to `src/main/**`, `src/preload/**`, or `src/shared/**` requires **fully killing Electron and restarting** (close the CMD window, kill stray `node.exe`/`electron.exe` in Task Manager, double-click `start-mv.bat`). If a user reports "I changed X but nothing happened" and X is in main/preload/shared, the cause is almost always that they did not restart.

## Architecture

### Three processes (electron-vite layout)

```
src/
  main/       Node-side IPC handlers, file IO, AI provider calls
  preload/    contextBridge → window.api surface
  renderer/   React + Zustand + Tailwind (HashRouter)
  shared/     Types, IPC channel names, system prompts — imported by all 3
```

The build pipeline (`electron.vite.config.ts`) emits to `out/{main,preload,renderer}`. Path aliases `@` and `@shared` only resolve inside renderer code.

### Data model (`src/shared/schema.ts`)

A project on disk is a directory containing `project.json` + `refs/character/*` + `refs/costume/*`. The full shape is `ProjectData`. Two key invariants:

1. **`SCHEMA_VERSION` + `normalizeProject()`** — older projects may be missing fields added later. Every renderer load goes through `normalizeProject()` to backfill defaults. When adding a new field, update both `createEmptyProject` and `normalizeProject`. Renderer components must **also** locally fall back (`?? []`, `?? ''`) — historic bug: Vite HMR doesn't re-run `setProject`, so a freshly-added field is `undefined` until full restart.

2. **AI returns are sanitized field-by-field**, not just at the top level. `sanitizeConcept` / `sanitizeStoryboard` in `claudeProxy.ts` coerce every field (`color_palette` → string[], any string field → string via `toStr`). The model frequently returns wrong shapes (string instead of array, object instead of string, Chinese key names) — never trust the raw parse. Bugs to remember:
   - Step 1 sometimes returns a bare array instead of `{face_analysis, concepts}` → `normalizeStep1Result` wraps it.
   - Step 2 sometimes returns Chinese keys (`景别`, `运镜`, …) → `CN_KEY_MAP` + `remapKeys()` translates before sanitize.
   - When a storyboard renders `undefined` in the output line, the fix is **either** (a) ensure `sanitizeStoryboard` has a fallback for that field, **or** (b) ensure `renderStoryboardLine` (`src/renderer/src/services/promptRenderer.ts`) calls `f(value, fallback)`. Both layers exist deliberately as belt-and-suspenders.

### IPC contract

All channel names live in `src/shared/ipcChannels.ts` as the `IPC` const. Adding a handler is a 3-file change: register in `src/main/ipc/*`, add to `main/index.ts` if it's a new file, expose in `src/preload/index.ts`. The renderer only talks to main through `window.api.*`.

Streaming flow for Claude calls:
- `claude.generateConcepts` / `generateStoryboards` are `invoke`-style (return final JSON) **and** stream incremental text via `claude:streamChunk` events keyed by `requestId`. The renderer uses chunks to show a live char counter; the final JSON is the `invoke` return value.

### AI provider abstraction

`src/main/providers/` is a small strategy pattern. `createProvider(settings)` returns one of:

| Provider | Notes |
|---|---|
| `claude-code-cli` (default, recommended) | Spawns local `claude` CLI with `--input-format stream-json --output-format stream-json --tools "" --permission-mode bypassPermissions`. **No API key needed** — uses the user's already-logged-in CLI session. This is the primary path; everything else exists as fallback. |
| `anthropic` | Direct Anthropic SDK. The `claudeCodeMode` flag toggles spoofing as Claude Code (some 中转 providers like PackyCode/AnyRouter only accept CC clients). |
| `openai` | OpenAI-compat — used for DeepSeek, 通义千问, Kimi, 智谱, SiliconFlow, OpenRouter, custom (see `PROVIDER_PRESETS`). |
| `gemini` | Google generativeLanguage API. |

The `Provider` interface is `{ chat, chatStream, ping, supportsVision }`. All four implementations must accept `ContentPart[]` (`text` or `image` with base64). Images are passed inline; no URL fetching.

`claudeCodeCli.ts` uses `spawn(... { shell: true, cwd: os.tmpdir() })` on Windows — the shell+tmpdir combination avoids path/quoting issues with the system prompt (which is ~2.5KB of Chinese with newlines and braces). Don't refactor this to `shell: false` without testing on Windows.

### Prompt engineering lives in `src/shared/prompts.ts`

`STEP1_SYSTEM_PROMPT` and `STEP2_SYSTEM_PROMPT` are deliberately long, opinionated, and Chinese. They encode:

- The exact JSON output shape (`{face_analysis, concepts: [...]}` for step 1; bare array for step 2)
- A 10-module ordering for the `ai_image_prompt` string (camera → subject → outfit → setting → lighting → palette → style → mood → post-fx → quality) modeled on the 10 sample MJ prompts the user provided
- A 200–400 字 length floor for each `ai_image_prompt`
- A "must include user-specified elements" enforcement clause that's appended dynamically in `claudeProxy.ts` based on whether `args.elements` is non-empty
- An "every field is required, never null/undefined/empty" clause for storyboards (because the model would otherwise leave shot_size/angle blank)

When editing these prompts, also bump `maxTokens` if you increase length expectations — current values (`6000` step 1, `8000` step 2) are sized for the current floors.

### State (renderer)

`src/renderer/src/services/store.ts` — a single Zustand store with `{projectPath, data, dirty}`. `updateData(mutator)` does an immutable clone + dirty flag. A subscriber auto-saves to disk 800ms after any change. `setProject` runs `normalizeProject` so HMR can't bypass it — but the same caveat: HMR doesn't re-run `setProject`, so during dev you may need Ctrl+R to see schema fixes for in-memory projects.

### Debug panel (`DebugDrawer.tsx` + `src/main/util/logger.ts`)

There is an **in-app debug panel** (🖥 floating button bottom-right) that streams every `log.{debug,info,warn,error}` call from main → renderer via the `debug:log` IPC event, plus an 800-entry ring buffer fetched on mount via `debug:getHistory`. When debugging a "nothing happened" report, ask the user to copy the panel contents — it's far more useful than DevTools console because it shows CLI spawn args, stdin bytes, every stream event, and normalization decisions in one place. If the panel shows `No handler registered for 'debug:getHistory'`, the user is running an old main process — restart Electron.

## Conventions specific to this codebase

- **Chinese UI everywhere.** Comments, log messages, and error strings are mixed Chinese + English — match the surrounding tone.
- **No async-await for IPC events**, only for `invoke`. The streaming chunks are fire-and-forget.
- **Images on disk are always passed through `sharp` resize** (max 1568px) in `IMAGE_IMPORT` to keep payloads sane for vision models. The `sharp` import is in a try/catch so the app still works if the native module fails to load.
- **`safeStorage`-encrypted settings** live in `app.getPath('userData')/settings.enc`. The API key is never echoed back to the renderer — only `apiKeySet` + `apiKeyTail` (last 4 chars). When mutating settings, an empty `apiKey` means "don't change" and `clearApiKey: true` means "delete".
- **Default model identifier** is `claude-opus-4-7` (set in `DEFAULT_SETTINGS`). When the user is on `claude-code-cli` provider the model string is passed straight to `claude --model`.
- **Storyboard output is the user's contract** — `renderStoryboardLine` in `promptRenderer.ts` is the authoritative formatter. The user explicitly specified the template; don't add/remove punctuation, spaces, or fields without confirmation. The current order is: `景别角度:{shot}，{angle}，运镜视角:{movement}，{perspective}，{refs}，{audio}，【{scene}】，歌词:"{lyric}"`.
