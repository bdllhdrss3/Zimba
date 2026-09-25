# Zimba Development Rules

Read README.md and docs/STATUS.md before editing. This repository owns the reusable toolkit. Shows belong under examples or outside this repository. Do not modify Cheese Heist or the sibling cartoon-framework folder.

For an episode task, read the show's AGENTS.md, CARTOON.md, project.json, asset manifests and existing scene examples first. Work in that episode folder. Add only missing reusable assets. Do not rebuild the framework for a new story.

UI feedback is a proposal, not approved executable code. Read its scene, frame, target and revision. Check the current source before applying it. Mark a request applied only after validation and preview verification, with a resolution note. Ask before changing shared assets in ways that affect other episodes.

Use TypeScript, the documented scene API and stable IDs. Keep authoring code deterministic. Run npm run check and npm test after framework edits; run the browser integration tests for renderer/UI changes. No cloud services or paid voice providers without user approval.