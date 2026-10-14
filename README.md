# Token Grove

<p align="center">
  <b>English</b> · <a href="README.ko.md">한국어</a>
</p>

A Windows desktop app that grows a pixel-art plant from your AI coding usage.
Use Claude Code or Codex as you normally do and a small flower pot on your desktop grows by itself. There is nothing to click.

<p align="center">
  <img src="docs/sprite-preview.png" width="720" alt="10 species x 10 growth stages of pixel plants">
</p>

## How it works

- **Pet window**: a small transparent window with a flower pot. Drag it anywhere; it stays on top of other windows. Click it and it talks back. Right-click it for the menu (open the garden, hide to tray, launch at login, quit). The tray icon brings it back.
- **Garden window**: open it with the `정원` (garden) button on the pet window. It shows the current plant's level and XP, its growth history, and a collection of the plants you have finished, a weather and streak summary, achievements and settings. `Save photo` exports the garden scene as a PNG.
- **Growth**: the app reads only token counts from the logs Claude Code and Codex write and turns them into XP. It checks for new log lines every 30 seconds.
- **Completion**: at level 11 the plant is stored in the garden collection and a new seed of a random species starts.

### Growth stages (10)

seed → sprout → seedling → young leaves → leafy → bud → first bloom → full bloom → fruit → big tree

Each of levels 1 to 10 is one stage. A full plant is tuned to take about a month at typical usage.

### Species (10)

Daisy, sunflower, tulip, balloon flower, rose, lavender, hydrangea, poppy, cosmos, cherry blossom.
The seed stage looks the same for every species, so you cannot tell which one you got until it sprouts.

### How XP is calculated

```
XP = (input tokens + output tokens x 5) / 30,000
```

- For Claude Code, input tokens are `input_tokens + cache_creation_input_tokens`. For Codex, they are `input_tokens - cached_input_tokens`.
- Cache reads (`cache_read_input_tokens`) are not counted. They re-read the same context on every turn, so counting them would inflate usage far beyond the work actually done.
- The same response is logged on several lines, so records are de-duplicated by `message.id` and `requestId`.
- Usage recorded before the first launch is not rewarded. On the first run the app only remembers where each log file currently ends.

The conversion rules live in [`src/shared/usage.ts`](src/shared/usage.ts).

## Privacy

- Everything stays on your PC. Nothing is sent anywhere.
- From the logs the app extracts only the record ID, timestamp and token numbers. Prompts, conversation text and code are never stored or printed.
- The original logs (`~/.claude/projects/**/*.jsonl` and `~/.codex/sessions/**/*.jsonl`) are only read, never modified.
- The only file the app writes is `%APPDATA%\tokengrove\save.json`.
- The only network request is an update check: the app asks GitHub for the latest release of this repository (at startup and every 6 hours) and, if there is a newer one, asks whether you want to open the download page. No usage data is sent. You can turn it off in the settings.

## Download

Grab the latest `TokenGrove-Setup-<version>.exe` from [Releases](https://github.com/oceanfromthewave/tokenGrove/releases/latest) and run it.
The installer is not code-signed, so Windows SmartScreen may show a warning. Choose "More info" and then "Run anyway".

## Getting started

Requirements: Windows and Node.js 22 or newer (the tests rely on Node running `.ts` files directly).

```powershell
npm install
npm run dev
```

To build an installer:

```powershell
npm run build:win      # dist\TokenGrove-Setup-<version>.exe
```

### Development commands

| Command | Description |
|---|---|
| `npm run dev` | Run in development mode |
| `npm run typecheck` | Type-check with TypeScript |
| `npm test` | Run the tests (Node's built-in test runner) |
| `npm run preview:sprites` | Render every species x stage sprite into a single PNG |
| `npm run build:unpack` | Package into `dist\win-unpacked` without an installer |

## Structure

```
src/
├─ shared/     Pure logic with no Electron dependency; tests sit next to it.
│              growth (levels, stages, species, completion), usage (record model, XP, de-duplication),
│              claudeCode and codex (log line to record), save (save-file validation), sprites (pixel art)
├─ main/       Window management, the single source of truth for pet state, saving, incremental log reading
├─ preload/    The small, explicit API exposed to the renderer
└─ renderer/   React UI (pet window and garden window)
```

- Usage collection and game rules are separate. To support another AI tool, you only need an adapter that converts its logs into the common `UsageRecord` format.
- The renderer never touches the file system or privileged Electron APIs directly; it only uses the functions exposed by the preload script.
- Pixel art is authored as the left half only and mirrored, so every plant is perfectly symmetric.

## Current limitations

- Supported log sources are **Claude Code** and **Codex**. Other tools are not connected yet.
- Tested on Windows only.
- The XP conversion rate was tuned to the author's own usage, so growth speed will vary from person to person.

## License

[MIT](LICENSE)
