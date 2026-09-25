# Ownership and File Structure

Framework: src contains API/schema, project loader, validation, player, server, render, CLI and review UI. extension contains the native VS Code host. templates/show is the versioned starter. docs and tests keep the workflow reproducible.

Each show owns:

```text
project.json                 output configuration (authoritative)
CARTOON.md                   story/style bible (editorial guidance)
AGENTS.md                    AI read order and scope rules
assets/<category>/<id>/      manifest and reusable artwork/audio
episodes/<id>/story.md       requested story
episodes/<id>/episode.json   ordered scene module paths
episodes/<id>/scenes/*.ts    authored choreography
feedback/*.json             review proposals and resolution notes
renders/*.mp4               generated output
.zimba/                     disposable bundles/render work
```

project.json: schemaVersion, id, title, width, height, fps, poseFps, previewScale. Defaults live in the starter; files own values. Settings UI produces a proposal rather than updating the file. Canvas fits the available pane; previewScale is reserved for future encoded preview profiles and is not currently applied to exports.

episode.json: schemaVersion, id, title, scenes (relative module paths). IDs use lowercase letters, digits, hyphens and underscores, starting with a letter. The episode folder matches its ID. No central framework registry of episodes exists.

## Feedback

Feedback JSON contains id, createdAt, episode, scene, frame, target, revision, kind, text, optional proposed property values and sketch strokes, and status. Revision is a SHA-256 of compiled scene code, configuration and resolved assets. Kinds: comment, transform, timing, appearance, sketch, settings, reference.

Frame is scene-local at output fps. Transform values are local world coordinates; sketches are pairs of world x/y coordinates under the camera at the selected frame. Proposal overlays never appear in export. Each file is one request to avoid concurrent queue rewrites.

Statuses: pending, applied, rejected, needs-clarification. Agent adds a resolution explaining its verified implementation or reason for rejection. The UI labels older revisions. The server rejects submission from stale previews. Instructions cannot force an arbitrary agent to obey scope: review diffs and use editor permissions when enforcement is required.

## Security and Runtime

Trusted local code only. Validation executes TypeScript modules with Node privileges. Workspace Trust gates extension execution. The local service binds 127.0.0.1, uses a random access token, validates feedback, rejects path escapes/symlinks in asset trees and does not expose arbitrary shell endpoints. Close the Studio panel to terminate its service. Do not forward the preview port to the internet.