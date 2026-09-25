import type {SceneBuilder} from 'zimba';

// Episode-local staging shared by every scene in this episode.
export const LOBBY = {miloX: 640, miloY: 340, deskX: 590, deskY: 445, dotY: 380};
export const CLOSE = {scale: 1.7, miloX: 760, miloY: 150, dotX: 110, dotY: 140, counterY: 460};

/** Quiet ambient bed under dialogue; the music asset is 8s long. */
export function nightMusic(scene: SceneBuilder, duration: number) {
  scene.sound(0, 'music-night', Math.min(duration, 8), {gain: 0.35});
}

/** Close-up framing: characters large, counter in front of them. Call after adding characters. */
export function counterForeground(scene: SceneBuilder) {
  scene.actor('counter', 'counter-front', {x: 0, y: CLOSE.counterY});
}
