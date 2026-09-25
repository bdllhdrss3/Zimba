# Zimba

Code-first limited-animation cartoons, with a native VS Code review workspace.
Write scenes in TypeScript, reuse show assets, preview immediately, and export MP4.
Visual edits are proposals saved for the coding agent; they never silently rewrite scene code.

**New here? Follow [docs/HOW_TO.md](docs/HOW_TO.md)**: a plain step-by-step guide that says exactly what you do and what to ask the AI at each stage, from install to finished episode. [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) has the longer explanations. A finished 30-second example is `examples/small-hours`, episode `night-shift`.

## Start

Requires Node 22+, FFmpeg/ffprobe on PATH, and Microsoft Edge. The default headless browser is Edge; set ZIMBA_BROWSER to a Playwright browser channel if needed. Built-in offline speech requires Windows (`zimba voices` lists installed voices).

```powershell
npm install
npm run build
node dist/cli.mjs doctor
node dist/cli.mjs preview --show examples/small-hours --episode night-shift
```

Open the printed local URL. The CLI selects a free port. Run `npm install` inside a newly initialized show to enable its npm commands and TypeScript editor imports.

## Native VS Code Studio

```powershell
npm run build:extension
```

Open `extension` in VS Code and press F5, then run **Zimba: Open Studio** in the Extension Development Host. Choose the show's project.json. Alternatively install the generated VSIX when provided. A show file can be opened with **Reopen Editor With > Zimba Studio**. The extension runs the same local preview as the browser, inside a native webview panel. It requires a trusted workspace and terminates its preview process when the panel closes.

## Author and Render

```powershell
node dist/cli.mjs init e:\videos\my-show                          # new show from the template
node dist/cli.mjs assets --show examples/small-hours
node dist/cli.mjs episode new episode-002 --show examples/small-hours
node dist/cli.mjs validate --show examples/small-hours --episode night-shift
node dist/cli.mjs stills --show examples/small-hours --episode night-shift
node dist/cli.mjs sheet milo --show examples/small-hours
node dist/cli.mjs lineup --show examples/small-hours
node dist/cli.mjs tts line-hello --show examples/small-hours --voice "Microsoft George" --text "Hello"
node dist/cli.mjs feedback --show examples/small-hours --status pending
node dist/cli.mjs render --show examples/small-hours --episode night-shift
```

Exports, contact sheets and model sheets live in the show's renders directory. New episode creation refuses existing folders. Framework and previous episodes are not regenerated. `templates/show` is the starter source; `examples/small-hours` is an independent initialized show.

## Studio Views

- **Scene**: real-time playback with audio, frame stepping, a timeline of every action and sound cue, selection, transform handles, sketching, and proposals for position, expression, pose, timing and production settings.
- **World**: the cast and props at true scale on the main set, a model sheet for any asset (every expression, pose, speaking mouth and anchor), and audio audition. Feedback can target any asset.

## Documentation

- [How to make a cartoon (step by step)](docs/HOW_TO.md)
- [Story prompt template and example](docs/STORY_PROMPT.md)
- [Getting started with AI](docs/GETTING_STARTED.md)
- [AI workflow rules](docs/AI_GUIDE.md)
- [Scene and animation API](docs/SCENE_API.md)
- [Assets and character API](docs/ASSET_GUIDE.md)
- [Project structure and feedback](docs/PROJECT_STRUCTURE.md)
- [Implementation status and limits](docs/STATUS.md)

## Development

`npm run check`, `npm test`, `npm run test:integration` and `npm run test:episode` verify types, contracts, real browser playback, feedback, source reloads and export. `test:episode` drives every Studio feature in real time on the 30-second example and exports it. `cd extension; npm test` checks the VS Code host. `npm run spike` tests the initial renderer choice. Rendering and browser tests run trusted project code; they are not a sandbox for untrusted downloads.