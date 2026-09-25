# How to Make a Cartoon with Zimba

A plain step-by-step guide. At each step it tells you who does the work:

- **YOU DO**: something you type in the terminal or click yourself.
- **ASK THE AI**: copy the prompt into Copilot Chat (Agent mode) in VS Code and send it. Change the parts in [square brackets].
- **CHECK**: what you should see before moving on.

The order is: install, create your show, build your characters and sets as separate pieces, test them, then write stories that use them.

---

## Part 1: Setup (once per computer)

### Step 1: Install the tools

**YOU DO:** Install these if you don't have them:
- Node.js 22 or newer
- FFmpeg (it must work when you type `ffmpeg -version` in a terminal)
- Microsoft Edge (already on most Windows PCs)
- VS Code with GitHub Copilot

### Step 2: Set up Zimba

**YOU DO:**
```powershell
cd e:\videos\zimba
npm install
npm run build
node dist/cli.mjs doctor
node dist/cli.mjs voices
```

**CHECK:** `doctor` reports Node, FFmpeg and the browser without errors. `voices` lists voices such as Microsoft George, Hazel and Susan.

---

## Part 2: Create Your Show (once per cartoon series)

A "show" is one cartoon series. It holds your characters, sets and every episode.

### Step 3: Create the show folder

**YOU DO:**
```powershell
node e:\videos\zimba\dist\cli.mjs init e:\videos\my-show
cd e:\videos\my-show
npm install
code .
```

VS Code opens your new show. It starts with a sample cast (Milo and Dot), a sample set and a short sample episode so you can see how things work.

From now on, run commands from inside your show folder as `npx zimba <command>`.

### Step 4: Open the Studio

**YOU DO:**
```powershell
npx zimba preview
```
Ctrl+click the link it prints. Press play to watch the sample episode, then click **World** to see the sample characters.

Leave this running. It updates by itself whenever the AI changes files.

### Step 5: Describe your show

**ASK THE AI:**
```text
Read AGENTS.md, CARTOON.md and docs/GETTING_STARTED.md.
Rewrite CARTOON.md for my new show:
- Name: [show name]
- Tone and audience: [e.g. silly slapstick for kids]
- Art style: [e.g. simple round shapes, thick outlines, bright colours]
- Main characters: [name, what they look like, personality, for each]
- Main locations: [e.g. a kitchen, a garden]
Don't create any assets yet. Ask me about anything unclear.
```

**CHECK:** Open `CARTOON.md` and read it. Change anything you don't like yourself. This file is the rulebook for every future episode.

---

## Part 3: Build Your Pieces First (characters, sets, props, voices)

Build each piece on its own before any story. Do them one at a time so you can check each one.

### Step 6: Create a character

**ASK THE AI:**
```text
Read CARTOON.md and docs/ASSET_GUIDE.md, and run `npx zimba assets` to see what exists.
Create a character called [Whiskers]: [a lazy grey cat, round body, pointy ears].
Expressions: neutral, happy, angry, surprised.
Poses: idle, wave, [walk], [pounce].
It needs open and closed mouth shapes for talking.
Then run `npx zimba sheet [whiskers]`, look at the image, and fix anything that looks wrong.
```

**CHECK:** In the Studio, click **World**, then click the new character. You'll see every expression and pose side by side. The file is also saved in `renders/sheets/`.

Repeat Step 6 for each main character.

### Step 7: Create a set (background)

**ASK THE AI:**
```text
Create a set called [kitchen]: [window with night sky, fridge, table, checkered floor].
Match the style in CARTOON.md.
Then run `npx zimba lineup` and check the characters look the right size in it.
```

**CHECK:** In **World**, the lineup shows your characters standing in the set at their real size.

### Step 8: Create props (objects)

**ASK THE AI:**
```text
Create these props: [a cheese wedge], [a frying pan], [a mousetrap with poses open and snapped].
If a prop should hide characters behind it (like a table front), say so in its description.
Run `npx zimba sheet <id>` for each one and check it.
```

### Step 9: Create voices and sounds

**ASK THE AI:**
```text
Run `npx zimba voices`. Give [Whiskers] the voice [Microsoft George].
Create these dialogue lines with `npx zimba tts`:
- [whiskers-mine]: "[Mine!]"
- [whiskers-ouch]: "[Ouch!]"
Also add sound effects: [a bonk], [a whoosh], and a short background music loop.
Record the voice choices in CARTOON.md.
```

**CHECK:** In **World**, click the **Audio** tab and click a sound to hear it.

**Using your own audio files:** put them in the show folder and ask the AI to "add [file] as an audio asset".

**Using reference pictures:** attach an image in chat and say "use this as a reference for [character]". The AI draws its own version in the show's style.

### Step 10: Fix the pieces with feedback

**YOU DO:** In the Studio, go to **World**, click a character, type what you want changed (e.g. "make the ears bigger, eyes rounder") and click **Save proposal**. Do this for anything you want changed.

**ASK THE AI:**
```text
Run `npx zimba feedback --status pending`.
Apply each request, check it with `npx zimba sheet`, then mark each one done with
`npx zimba resolve <id> --status applied --note "<what you changed>"`.
Ask me if anything is unclear.
```

**CHECK:** The Studio updates by itself and shows the changes.

### Step 11: Test the pieces moving (practice episode)

**ASK THE AI:**
```text
Create a practice episode called `playground` with `npx zimba episode new playground`.
Add short test scenes:
1. [Whiskers] walks across the [kitchen] and waves.
2. [Whiskers] shows each expression, one per second.
3. [Whiskers] says [his line] so I can check the mouth moves.
Validate it and run `npx zimba stills --episode playground`, then check the images.
```

**YOU DO:** In the Studio, choose **playground** from the Episode list and press play.

Fix anything that looks off (Step 10), and repeat until your cast looks right.

---

## Part 4: Make an Episode

### Step 12: Write your story

**YOU DO:** Write the story in plain words: what happens, who says what, and roughly how long. For example:

```text
Episode 1: "The Cheese Heist" (about 40 seconds)
1. Night in the kitchen. Whiskers is asleep by the fridge.
2. The mouse tiptoes out and grabs the cheese from the table.
3. Whiskers wakes up, yells "Mine!" and chases the mouse.
4. The mouse ducks into its hole. Whiskers hits the wall: "Ouch!"
5. The mouse waves from the hole, eating the cheese. The end.
```

**Want better results?** Use the full template in [STORY_PROMPT.md](STORY_PROMPT.md). Besides the story, it covers the cast, sets, props, exact dialogue and voices, camera, sounds, timing, rules and what "done" means. It includes a ready-to-run example.

### Step 13: Ask the AI to build it

**ASK THE AI:**
```text
Read AGENTS.md, CARTOON.md, docs/AI_GUIDE.md and docs/SCENE_API.md,
and look at an existing episode's scenes as an example.
Create episode `episode-001` from this story:
[paste your story]
Run `npx zimba episode new episode-001` first.
Reuse the existing characters, sets, voices and sounds. Only add what's missing.
Make one scene file per story beat.
Then run `npx zimba validate --episode episode-001` and `npx zimba stills --episode episode-001`,
look at every image, and fix problems before you tell me it's done.
Don't change the framework or other episodes.
```

**CHECK:** The AI tells you which files it created and anything new it had to add. In the Studio, pick **episode-001** and press play.

### Step 14: Review and give feedback

**YOU DO:** Watch it in the Studio. Where something is wrong:
- **Pause** on the exact moment.
- **Click a character** and drag its outline to where it should be, or change its expression or pose in the Review panel.
- **Drag an item on the timeline** to change when something happens.
- **Use the pen** to draw a note on the frame ("put a clock here").
- **Type a comment** explaining what you want.
- Click **Save proposal**.

Nothing changes in the cartoon yet. Your notes are saved for the AI.

**ASK THE AI:**
```text
Run `npx zimba feedback --status pending` for episode-001.
Apply each request in the scene or asset files. Validate, check with
`npx zimba stills --episode episode-001 --scene <id>`, and resolve each one with a note.
Ask me about anything that's unclear or out of date.
```

Repeat Step 14 until you're happy.

### Step 15: Add, remove or change a scene

**ASK THE AI** (examples):
```text
In episode-001, add a new scene after scene 3: [Whiskers slips on a banana peel]. About 5 seconds.
```
```text
In episode-001, scene 2: make the mouse tiptoe slower and look nervous.
```
```text
In episode-001, remove the last scene and end on the wave instead.
```

### Step 16: Export the video

**YOU DO:**
```powershell
npx zimba render --episode episode-001
```
Or click **Export MP4** in the Studio.

**CHECK:** The video is at `renders/episode-001.mp4`. Double-click it to watch.

---

## Part 5: Every Episode After That

Repeat Steps 12 to 16 with a new name (`episode-002`, `episode-003` and so on).

Everything you've already built is reused. If a story needs something new (a new character, set or prop), the AI adds it once and it's then available to every future episode.

**ASK THE AI:**
```text
Create episode `episode-002` from this story: [paste story].
Same rules as before: reuse everything that exists, only add what's missing,
validate, check the stills, and don't change episode-001.
```

---

## Golden Rules

1. **Build pieces first, stories second.** Good characters and sets make every episode easier.
2. **One piece at a time.** Create a character, check it, fix it, then move on.
3. **Always check the images.** Ask the AI to run `stills` or `sheet` and look at them. This catches characters hidden behind furniture, mouths out of view and props in the wrong place.
4. **Give feedback in the Studio.** It records the exact scene, moment and character, so the AI knows precisely what you mean.
5. **Start a new episode for each story.** Only use `init` when starting a completely new cartoon series.
6. **Check what changed.** The AI is told not to rebuild the framework or old episodes, but look at the changed-files list before accepting.

## Quick Command List

| You want to | Command |
|---|---|
| Open the Studio | `npx zimba preview` |
| See what assets exist | `npx zimba assets` |
| Start an episode | `npx zimba episode new <name>` |
| Check an episode for errors | `npx zimba validate --episode <name>` |
| Picture grid of every scene | `npx zimba stills --episode <name>` |
| Picture of one character or prop | `npx zimba sheet <id>` |
| Everyone side by side | `npx zimba lineup` |
| List voices / make a voice line | `npx zimba voices` / `npx zimba tts <id> --text "..." --voice "..."` |
| See your feedback | `npx zimba feedback --status pending` |
| Export the video | `npx zimba render --episode <name>` |

## If Something Goes Wrong

- **Red error bar in the Studio:** the last change broke a scene file. Tell the AI "the Studio shows this error: [paste it], please fix it". The Studio keeps showing the last working version until it's fixed.
- **"Voice not found":** run `npx zimba voices` and use a name exactly as listed.
- **A character's mouth doesn't move:** ask the AI to check the mouth is visible in frame and that the line is attached to that character.
- **The AI started rebuilding everything:** stop it and say "Read AGENTS.md. Only work inside episodes/<name> and add only missing assets."
- **Want more detail:** see [GETTING_STARTED.md](GETTING_STARTED.md) for longer explanations and [SCENE_API.md](SCENE_API.md) for everything scenes can do.

A finished example made this way is the `night-shift` episode in `examples/small-hours` in the Zimba folder.
