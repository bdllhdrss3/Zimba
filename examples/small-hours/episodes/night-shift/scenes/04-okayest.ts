import {defineScene} from 'zimba';
import {CLOSE, counterForeground, nightMusic} from './staging';

export default defineScene({id: 'okayest', title: "World's okayest clerk", environment: 'counter-room', duration: 7}, scene => {
  nightMusic(scene, 7);
  const s = CLOSE.scale;
  const dot = scene.actor('dot', 'dot', {x: CLOSE.dotX, y: CLOSE.dotY, scaleX: s, scaleY: s}, 'happy');
  const milo = scene.actor('milo', 'milo', {x: CLOSE.miloX, y: CLOSE.miloY, scaleX: s, scaleY: s}, 'neutral');
  counterForeground(scene);
  const mug = scene.actor('mug', 'mug', {x: 560, y: CLOSE.counterY - 110 * s + 6, scaleX: s, scaleY: s});

  mug.pose(0.6, 'text');
  scene.sound(0.6, 'sfx-pop', 0.3);
  mug.move(0.6, 0.2, {scaleX: s * 1.12, scaleY: s * 1.12, x: 549, y: 262}, 'power1.inOut')
    .move(0.8, 0.25, {scaleX: s, scaleY: s, x: 560, y: CLOSE.counterY - 110 * s + 6}, 'power1.inOut');

  milo.expression(0.9, 'surprised').expression(1.5, 'happy');
  milo.say(1.7, 'line-milo-okayest', 3.605, "World's okayest clerk. I love it.");
  milo.pose(3.2, 'wave').pose(5.4, 'idle');
  scene.camera(0, 4, {scaleX: 1.08, scaleY: 1.08, x: -51, y: -29});
  scene.sound(5.8, 'sfx-chime', 1.15, {gain: 0.6});
});
