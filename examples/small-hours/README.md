# My Zimba Show

**Start here: [docs/HOW_TO.md](docs/HOW_TO.md)**. It walks you step by step through building your characters and sets, then making episodes, and tells you exactly what to ask the AI at each step. When you're ready to write an episode, copy the template in [docs/STORY_PROMPT.md](docs/STORY_PROMPT.md).

This project uses Zimba 0.1. Edit CARTOON.md to define your show before creating episodes. The starter contains original example characters, not a mandatory art style.

Run npm install once, then npm run preview, npm run validate, or npm run render. For another episode: `npx zimba episode new episode-002`. Inspect assets with `npx zimba assets`. Select an episode using `--episode episode-002`.

Start with docs/GETTING_STARTED.md: it walks through defining the show, building characters and sets, making an episode and giving feedback, with copy-paste AI prompts. Read docs/AI_GUIDE.md for the rules an agent follows. Your story goes in episodes/<id>/story.md; the agent writes scenes and updates episode.json. Existing assets are reused. New shows use `zimba init <new-directory>`, not a copy of this show's episode folder.

Open project.json with Zimba Studio in VS Code (or `npm run preview`) to see scenes, the World view of every asset, and feedback. Comments and visual edits become feedback/*.json; they do not change the cartoon until an agent applies them. Final MP4 files, contact sheets (`zimba stills`) and model sheets (`zimba sheet`) are written to renders/.