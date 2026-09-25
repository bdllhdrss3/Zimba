# Building Cartoons With AI: Step by Step

This guide covers the whole path from an empty folder to a finished episode, with copy-paste prompts for Copilot (or any coding agent). The AI writes the code; you direct it, review it in Zimba Studio and give feedback.

The worked example is `examples/small-hours`, episode `night-shift`: a 30-second, 4-scene cartoon made exactly this way.

## 0. One-Time Setup

Requires Windows, Node 22+, FFmpeg/ffprobe on PATH and Microsoft Edge.

```powershell
cd e:\videos\zimba
npm install
npm run build
node dist/cli.mjs doctor      # checks Node, FFmpeg and the headless browser
node dist/cli.mjs voices      # lists the offline voices you can use for dialogue
```

For the VS Code panel, run `npm run build:extension`, open the `extension` folder in VS Code, press F5, then run **Zimba: Open Studio** in the window that opens. You can also use the browser Studio: `node dist/cli.mjs preview --show <show>` prints a local link.

Below, `zimba` means `node e:\videos\zimba\dist\cli.mjs`. Inside a show folder where you have run `npm install`, `npx zimba` also works.

## 1. Start a New Show (once per cartoon series)

```powershell
node dist/cli.mjs init e:\videos\my-show
cd e:\videos\my-show
npm install
```

This creates `CARTOON.md` (the show bible), `AGENTS.md` (rules the AI follows), `project.json` (resolution, frame rates), starter assets and a sample episode. Open the folder in VS Code.

**Prompt 1: define your show**

> Read AGENTS.md, CARTOON.md and docs/AI_GUIDE.md. Rewrite CARTOON.md for my new show: [describe tone, audience, art style, 2-4 main characters with personality and looks, and the main locations]. Keep the limited-animation rules. Don't create assets yet. Ask me anything that's unclear.

Review and edit CARTOON.md yourself. It's the reference every future episode is checked against.

## 2. Build the World (characters, sets, props)

**Prompt 2: create the cast and sets**

> Read CARTOON.md and docs/ASSET_GUIDE.md. Run `zimba assets` to see what exists. Create the characters and locations from CARTOON.md as reusable assets under assets/. Each character needs expressions neutral, happy, surprised (plus any others the bible needs), poses idle and wave, and open/closed mouth shapes. Remove starter assets we no longer need only after asking me. Then run `zimba lineup` and `zimba sheet <id>` for each new asset, look at the images and fix anything that looks wrong.

Supplying reference images: put them in `assets/references/<id>/` with a small `asset.json` of type `reference` (see the Asset Guide), or attach them to the chat. The AI uses them as guides for its drawing code.

**Review the world yourself:** open Studio, click **World**. You'll see every character and prop at true scale on the main set. Click any asset to see its model sheet: every expression, pose, the speaking mouth and its anchor points. Click an audio asset to hear it. Type feedback such as "make Milo's eyes bigger" and press **Save proposal**; it becomes a file the AI reads in the next step.

**Prompt 3: apply world feedback**

> Run `zimba feedback --status pending`. Apply each request to the asset files, re-run `zimba sheet` to check, then mark each one with `zimba resolve <id> --status applied --note "<what you changed>"`. Ask me if a request is unclear.

## 3. Make an Episode

Write your story in plain language: the beats, who says what, and roughly how long. Paste it into the chat or into a file.

**Prompt 4: create the episode**

> Read AGENTS.md, CARTOON.md, docs/AI_GUIDE.md and docs/SCENE_API.md, and look at an existing episode's scenes as an example. Create episode `episode-002` from this story: [paste story]. Run `zimba episode new episode-002` first. Reuse existing characters and sets. Only add assets that are genuinely missing. Generate dialogue with `zimba tts` (Milo: Microsoft George, Dot: Microsoft Zira Desktop). Then run `zimba validate --episode episode-002` and `zimba stills --episode episode-002`, look at the contact sheets and fix staging problems before handing back. Don't change the framework or other episodes.

**What the AI should do** (you can check its work against this list):

1. Read the show files, then `zimba assets` to see what exists.
2. `zimba episode new episode-002` (never `init` for a new episode).
3. Write `story.md`, list scene files in `episode.json`, write one TypeScript file per scene.
4. Add only missing assets (for example a new prop), then `zimba sheet <id>` to check them.
5. `zimba tts <id> --text "..." --voice "..."` for each line, using the reported duration in `actor.say(...)`.
6. `zimba validate` until it passes.
7. `zimba stills` and actually look at the images: characters hidden behind furniture, mouths off-screen, objects in the wrong place.
8. Tell you what it created and anything it couldn't verify.

In the night-shift example, step 7 caught three real problems before export: Dot's mouth hidden behind the counter, the parcel landing on Milo's face, and wave poses hidden behind the heads.

## 4. Review in Studio and Give Feedback

Open Studio on your show and pick the episode.

- **Play** watches in real time with sound. Scrub, or step frame by frame.
- **Timeline**: click a cue to jump to it. Drag a cue to a new time to propose retiming it.
- **Canvas**: click a character, drag its ghost to propose a new position, or use the handles to resize or rotate. Change the proposed expression or pose in the Review panel.
- **Pen tool**: sketch on the frame ("put a poster here").
- **World** tab: model sheets and audio for asset-level feedback.
- **Production settings**: propose resolution or frame-rate changes.

Every **Save proposal** writes one file to `feedback/` with the scene, frame, target, your comment and any proposed values. **Nothing in the cartoon changes until the AI edits the code.** That's deliberate: the AI decides how to implement your request properly.

**Prompt 5: apply scene feedback**

> Run `zimba feedback --status pending`. For each request, check it still matches the current code (the revision and frame), make the change in the scene or asset files, run `zimba validate` and `zimba stills --scene <id>` to confirm, then resolve it with a note. Ask me about stale or ambiguous requests instead of guessing.

Studio refreshes on its own when files change. If a change breaks the code, Studio keeps the last working preview and shows the error. Feedback made on an older version is labelled "older revision".

## 5. Export

```powershell
zimba render --episode episode-002                 # whole episode
zimba render --episode episode-002 --scene intro   # one scene, for quick checks
```

Or click **Export MP4** in Studio. Files go to `renders/`. The night-shift 30-second episode exports in about 25-35 seconds at 1280x720.

## 6. Every Episode After That

Repeat step 3 with a new episode id. The cast, sets, props, voices and music you already have are reused. New assets added for one episode become available to all future ones. The framework and older episodes aren't touched.

## Command Reference

| Command | Use |
|---|---|
| `zimba assets [id]` | What exists: IDs, expressions, poses, anchors, sources |
| `zimba episode new <id>` | New episode folder |
| `zimba validate --episode <id>` | Checks assets, expressions, timing, overlaps, audio lengths |
| `zimba stills --episode <id> [--scene s] [--every 1]` | Contact sheets the AI (and you) can look at |
| `zimba sheet <asset>` / `zimba lineup` | Model sheet / cast at true scale |
| `zimba tts <id> --text ... --voice ...` / `zimba voices` | Offline dialogue |
| `zimba preview` | Live Studio |
| `zimba feedback [--status pending] [--json]` | Read proposals |
| `zimba resolve <id> --status applied --note ...` | Close a proposal |
| `zimba render --episode <id> [--scene s]` | MP4 export |

## Troubleshooting

- **"Voice not found"**: run `zimba voices` and use an exact name from the list.
- **Validation says "overlapping writes"**: two moves change the same property at the same time on one character. Stagger them, or combine them into one move.
- **A character's mouth doesn't move**: the `say` cue must name that character and the mouth must be visible in frame (check with `zimba stills`).
- **Studio shows a red error bar**: the last edit broke a scene file. The message names the file; the previous preview stays up until it's fixed.
- **The AI rebuilt something it shouldn't have**: point it back to AGENTS.md. The instructions guide agents but can't block edits, so review the changed-files list before accepting.
