# Story Prompt Template

A good episode prompt gives the AI more than the story. It also says who is in it, where it happens, how long each part lasts, what everyone says, what it should sound like, and what the AI may and may not change. The more of this you give, the fewer questions the AI has to ask and the less it guesses.

This file has:
1. **The structure**: every section a story prompt can have, and why.
2. **A blank template** to copy.
3. **A short version** for quick episodes.
4. **A filled-in starter example** you can run on the `small-hours` example show.
5. **Templates for single scenes and changes.**

---

## 1. The Structure

| # | Section | What to put in it | Why it matters |
|---|---|---|---|
| 1 | **Instructions** | Which files to read and which commands to run | Makes the AI follow the project rules instead of rebuilding things |
| 2 | **Episode basics** | Episode id, title, target length | The id becomes the folder name; the length sets pacing |
| 3 | **Logline** | The whole story in 1-2 sentences | Keeps every scene pointing at the same joke or idea |
| 4 | **Cast** | Existing characters by asset id; new characters with looks and personality | Stops the AI inventing duplicates of characters you already have |
| 5 | **Locations** | Existing sets by id; new sets described | Same reason, for backgrounds |
| 6 | **Props** | Existing props by id; new props, including any states (open/closed, on/off) | Props with states need poses built in |
| 7 | **Scenes (beat sheet)** | One numbered entry per scene: set, length, action, camera, expressions, dialogue, sounds | This is the story itself, broken into buildable pieces |
| 8 | **Dialogue and voices** | Exact lines, who says them, which voice | The AI generates speech from the exact text you give |
| 9 | **Sound and music** | Music mood; sound effects and when they play | Sound carries a lot of the comedy |
| 10 | **Style and pacing** | Tone, comedy timing, how long to hold reactions | Limited animation depends on good holds and timing |
| 11 | **Continuity** | Where characters start and end; links to earlier episodes | Keeps episodes consistent with each other |
| 12 | **Rules** | What must be reused, what must not change, limits on new assets | Protects your existing work |
| 13 | **Done means** | Validate, check stills, export or not, what to report back | Tells the AI when to stop and what to show you |

**Tips for each scene entry:**
- **Set:** the asset id, e.g. `lobby`.
- **Length:** in seconds. 4-10 seconds per scene works well.
- **Action:** what happens, in order. Use "then" between steps.
- **Camera:** wide, close-up, push in, pull out, or a small shake for impacts.
- **Expressions/poses:** only use ones your characters have (check with `npx zimba assets`), or say you want a new one added.
- **Dialogue:** `Speaker: "exact words"`.
- **Sounds:** `[sound: door chime]` at the moment it happens.
- **Hold:** say where to pause for a reaction, e.g. "hold 1 second on Milo's face".

---

## 2. Blank Template

Copy everything in the box, fill in the [brackets] and delete any section you don't need.

```text
INSTRUCTIONS
Read AGENTS.md, CARTOON.md, docs/AI_GUIDE.md and docs/SCENE_API.md.
Run `npx zimba assets` and look at one existing episode's scenes as an example.
Create the episode with `npx zimba episode new [episode-id]`.
Ask me before making anything up that isn't covered below.

EPISODE
- Id: [episode-002]
- Title: [The Power Cut]
- Target length: [about 40 seconds]

LOGLINE
[One or two sentences: who wants what, what goes wrong, how it ends.]

CAST
Existing (reuse, don't redraw):
- [milo]: [role in this episode]
- [dot]: [role in this episode]
New (create once as reusable assets):
- [name]: [looks, colours, personality, expressions and poses needed]

LOCATIONS
Existing: [lobby], [counter-room]
New: [name: short description of what's in it]

PROPS
Existing: [desk], [parcel]
New: [name: description, and any states such as poses "off" and "on"]

SCENES
1. [Scene title] ([set], [N] seconds)
   Action: [what happens, in order]
   Camera: [wide / close-up / push in / pull out / shake]
   Expressions: [who looks how, and when]
   Dialogue: [Speaker: "line"]
   Sounds: [sound cues and when]
   Hold: [where to pause]
2. [...]

DIALOGUE AND VOICES
- [Milo]: voice [Microsoft George]
- [Dot]: voice [Microsoft Zira Desktop]
Generate each line with `npx zimba tts` and use the reported duration.

SOUND AND MUSIC
- Music: [mood; reuse music-night or create new]
- Effects: [list; reuse existing sfx-* where possible]

STYLE AND PACING
[Tone, comedy timing, how long reactions should hold, anything from CARTOON.md to emphasise.]

CONTINUITY
[Where characters start and end; references to earlier episodes.]

RULES
- Reuse existing characters, sets, props and sounds. Only add what's missing.
- Don't change the framework, project.json or other episodes.
- [Don't change the look of existing characters.]
- Record any new shared assets in CARTOON.md.

DONE MEANS
- `npx zimba validate --episode [episode-id]` passes.
- You ran `npx zimba stills --episode [episode-id]`, looked at every image and fixed problems
  (hidden mouths, characters behind furniture, props in the wrong place).
- [Export with `npx zimba render --episode [episode-id]`] or [don't export yet].
- Tell me which files you created, which new assets you added, and anything you couldn't check.
```

---

## 3. Short Version

For small episodes when the cast and sets already exist:

```text
Read AGENTS.md, CARTOON.md and docs/AI_GUIDE.md. Create episode [episode-003] ([about 20 seconds])
with `npx zimba episode new`. Reuse everything that exists and only add what's missing.

Story, one scene per line (set, seconds, what happens, dialogue):
1. [lobby, 6s] [Milo is stacking parcels. The top one wobbles.]
2. [lobby, 6s] [It falls on Dot as she walks in. Dot: "Ow."]
3. [counter-room, 8s] [Milo, embarrassed: "Special delivery?" Dot glares, then laughs.]

Voices: Milo = Microsoft George, Dot = Microsoft Zira Desktop.
Validate, check the stills, fix problems, then tell me what you made. Don't export yet.
```

---

## 4. Starter Example (ready to run)

This example uses the `small-hours` example show (Milo, Dot, the lobby, the counter close-up). It reuses everything and adds two new props and some sounds, so it shows the full flow. Open the `examples/small-hours` folder in VS Code and paste this into Copilot Chat.

```text
INSTRUCTIONS
Read AGENTS.md, CARTOON.md, docs/AI_GUIDE.md and docs/SCENE_API.md.
Run `npx zimba assets` and look at episodes/night-shift/scenes as an example,
including staging.ts. Create the episode with `npx zimba episode new power-cut`.
Ask me before making anything up that isn't covered below.

EPISODE
- Id: power-cut
- Title: The Power Cut
- Target length: about 36 seconds

LOGLINE
The lights go out during Milo's night shift. He panics, Dot arrives with a torch
that turns out to be tiny, and they end up reading a parcel label by the glow of the mug.

CAST
Existing (reuse, don't redraw):
- milo: the nervous night clerk
- dot: calm courier, arrives mid-episode
New: none

LOCATIONS
Existing: lobby, counter-room
New: none. For darkness, put a new "darkness" prop (a full-screen dark
rectangle, 1280x720) over the scene and fade its opacity, rather than making a new set.

PROPS
Existing: desk, mug, parcel, counter-front
New:
- darkness: full-frame near-black rectangle, opacity is animated to dim the scene.
- torch: a very small flashlight with poses "off" and "on" (on shows a pale yellow beam cone).

SCENES
1. Lights out (lobby, 8 seconds)
   Action: Milo at the desk, humming. Then the lights flicker twice and go dark
   (darkness fades to about 0.85 over 0.3 seconds).
   Camera: wide, then a slow push in on Milo during the dark.
   Expressions: Milo neutral, then surprised when the lights flicker.
   Dialogue: Milo (in the dark): "Hello? Anybody? I'm not scared."
   Sounds: two quick clicks for the flicker, a low hum that cuts out.
   Hold: 1 second of darkness before Milo speaks.

2. Help arrives (lobby, 9 seconds)
   Action: Door chime. Dot walks in from the left holding the torch (off).
   She switches it on. The beam is tiny.
   Camera: wide.
   Expressions: Dot neutral; Milo happy when the torch clicks on, then neutral when he sees the size.
   Dialogue: Dot: "Don't worry. I brought light." Milo: "That's it?"
   Sounds: sfx-chime, a click for the torch.
   Hold: half a second on Milo's face after "That's it?".

3. Mug glow (counter-room, 10 seconds)
   Action: Close-up behind the counter, darkness still at 0.85. Dot sets the torch
   down next to the mug. The beam hits the mug, and the slogan side (pose "text")
   turns to face them.
   Camera: close-up, gentle push in toward the mug.
   Expressions: both surprised, then Milo happy.
   Dialogue: Dot: "Your mug is brighter than my torch." Milo: "It's the okayest light."
   Sounds: sfx-pop when the mug turns.

4. Lights back (counter-room, 9 seconds)
   Action: The lights snap back on (darkness fades to 0 over 0.2 seconds).
   Both blink, then Dot waves goodbye with the wave pose.
   Camera: small pull out.
   Expressions: both surprised, then happy.
   Dialogue: Milo: "Oh. Well. That was fine."
   Sounds: a power-on hum returning, sfx-chime as Dot leaves.
   Hold: 1 second on Milo at the end.

DIALOGUE AND VOICES
- Milo: voice Microsoft George
- Dot: voice Microsoft Zira Desktop
Generate each line with `npx zimba tts` using ids like line-powercut-milo-hello,
and use the duration it reports in actor.say.

SOUND AND MUSIC
- Music: reuse music-night at low volume (gain about 0.25), but not during scene 1's darkness.
- Effects: reuse sfx-chime and sfx-pop. Create new sfx-click and sfx-hum with FFmpeg,
  like the existing sound assets.

STYLE AND PACING
Quiet, deadpan comedy. Let reactions breathe: hold on faces after each punchline.
Characters move at the show's normal limited frame rate; keep the camera moves gentle.

CONTINUITY
Same night as night-shift: the mug is already on the counter. Milo starts behind
the desk. Dot leaves at the end.

RULES
- Reuse existing characters, sets, props and sounds. Only add darkness, torch,
  sfx-click and sfx-hum.
- Don't change the framework, project.json, night-shift or pilot.
- Don't change how Milo, Dot or the mug look.
- Record the new props and sounds in CARTOON.md.

DONE MEANS
- `npx zimba validate --episode power-cut` passes.
- You ran `npx zimba sheet torch`, `npx zimba sheet darkness` and
  `npx zimba stills --episode power-cut`, looked at every image and fixed problems.
  Check the dark scenes are still readable (faces visible) and that mouths show while talking.
- Export with `npx zimba render --episode power-cut`.
- Tell me which files you created, which new assets you added, and anything you couldn't check.
```

---

## 5. Other Prompt Templates

**Add one scene:**
```text
In episode [episode-id], add a new scene after scene [N]:
- Title: [title]
- Set: [set id], length [N] seconds
- Action: [what happens]
- Camera: [...]
- Dialogue: [Speaker: "line"] (voice [name])
- Sounds: [...]
Add it to episode.json in the right place. Validate, run
`npx zimba stills --episode [episode-id] --scene [new-scene-id]`, check it, and tell me what you changed.
```

**Change an existing scene:**
```text
In episode [episode-id], scene [N] ([scene title]):
- [Make Dot enter half a second later.]
- [Hold on Milo's surprised face for one more second.]
- [Change the line to "..." and regenerate the voice.]
Don't change other scenes. Validate and check the stills for that scene.
```

**Add a new character or set before a story:**
```text
Read CARTOON.md and docs/ASSET_GUIDE.md and run `npx zimba assets`.
Create a new [character / set / prop] called [id]:
- Looks: [...]
- Personality or purpose: [...]
- Expressions: [...]  Poses: [...]  (characters need open/closed mouths too)
Match the show's style. Run `npx zimba sheet [id]` (and `npx zimba lineup` for characters),
check the image, fix problems and add it to CARTOON.md.
```

**Apply Studio feedback:**
```text
Run `npx zimba feedback --status pending`. Apply each request in the scene or asset files,
validate, check with `npx zimba stills` or `npx zimba sheet`, and resolve each one with
`npx zimba resolve <id> --status applied --note "<what you changed>"`.
Ask me about anything unclear or out of date instead of guessing.
```
