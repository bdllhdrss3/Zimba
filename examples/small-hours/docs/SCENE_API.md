# Scene and Animation API

Import `defineScene` from `zimba`. Export one default scene per file. An episode's scenes array declares order; no framework file lists episode scenes.

```ts
import {defineScene} from 'zimba';
export default defineScene({id: 'hello', title: 'Hello', environment: 'lobby', duration: 5}, scene => {
  const milo = scene.actor('milo', 'milo', {x: 100, y: 340});
  milo.move(0.5, 2, {x: 600}, 'power1.inOut');
  milo.expression(2.5, 'happy').pose(2.5, 'wave');
  scene.camera(0, 1, {scaleX: 1.05, scaleY: 1.05, x: -30, y: -20});
});
```

## Units and Scheduling

Coordinates are project pixels, origin top-left, x right/y down. Asset origin is its local top-left. Rotation is degrees. Scale is unitless. Opacity is 0..1. Times and durations are seconds local to each scene. Duration must equal a whole number of output frames. The scene holds after its last action until its declared end. Scenes start fresh; explicitly restage continuity.

Actions use absolute start times. Overlapping actions on different properties run concurrently. Overlapping writes to the same target/property are rejected. Scene duration is a hard boundary: no silent cropping of overruns. Characters move at project poseFps using held GSAP samples; the camera samples at output time. Seeking is deterministic if authoring code is deterministic. Do not use Date.now, network calls or unseeded random values in scene composition.

## Public Methods

- `scene.actor(instanceId, assetId, transform?, expression='neutral', pose='idle')`: separate instance of a shared character/prop.
- `actor.move(at, duration, transform, ease='none')`: animate x, y, scaleX, scaleY, rotation or opacity.
- `actor.expression(at, name)` and `actor.pose(at, name)`: select declared artwork variants.
- `actor.say(at, audioAssetId, duration, text, gain=1)`: prepared speech plus simple open/closed mouth cycling within the cue. This is cue-gated mouth animation, not phoneme or amplitude lip-sync. It is scheduled, NOT blocking: schedule later actions explicitly.
- `scene.sound(at, audioAssetId, duration, {gain?, actor?, text?})`: dialogue, music or effect at an explicit time. Multiple cues mix.
- `scene.camera(at, duration, transform, ease='power1.inOut')`: transform the whole world. Both scale axes must be set for uniform zoom. UI overlays are excluded from exported video.
- `scene.action({...})`: advanced explicit action ID for feedback stability. Kinds move/expression/pose/camera; see src/schema.ts for the typed fields. Keep IDs stable when rearranging actions.

Supported easing names: none, power1.inOut, back.out(1.7). GSAP owns interpolation; there is no bespoke physics engine. Hard cuts between scenes; fade an actor with opacity. Episode crossfades, continuous cross-scene music and skeletal IK are not included in 0.1.

## Reusable Actions

```ts
import type {Actor} from 'zimba';
export function greet(actor: Actor, at: number) {
  actor.expression(at, 'happy').pose(at, 'wave').pose(at + 1, 'idle');
}
```

Put show-local helpers beside the character or under episodes/shared. A helper may generate many ordinary scheduled actions. Do not add framework methods for every story beat.

## Audio Preparation

Create an audio asset with local file and measured duration, then schedule it. On Windows:

```powershell
zimba tts greeting --text "Welcome to the night shift."
```

This uses installed Windows voices offline; no API key, network service or cloning. `--voice` chooses an installed voice. CLI reports the measured duration. Use that duration for say; imported WAV/MP3 can be used instead. Imported assets need appropriate rights. Preview volume clamps at 1; final mix accepts gain up to 2 with limiting, so check an encoded export for loudness-critical work.