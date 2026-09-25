# Episode Production Instructions

Read README.md, CARTOON.md, project.json and docs/AI_GUIDE.md. Inspect assets before making any. Read the requested story and nearby scene examples.

For a new episode, create only episodes/<new-id> and genuinely missing shared assets. Never rebuild the toolkit, existing characters, environments or previous episodes without permission. Scene ordering belongs to the episode manifest.

Read pending feedback/*.json. Confirm its revision, scene, frame and target against the latest preview. Apply requested changes in source, validate and inspect playback, then update status to applied with a resolution note. Do not mark stale or unclear feedback applied automatically.

Use `npx zimba validate --episode <id>`, preview and render. Report output paths and any unverified behavior. Instructions guide scope but are not a filesystem security boundary.