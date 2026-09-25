import {defineScene} from 'zimba';
import {CLOSE, counterForeground, nightMusic} from './staging';

export default defineScene({id: 'unboxing', title: 'Unboxing', environment: 'counter-room', duration: 8}, scene => {
  nightMusic(scene, 8);
  const s = CLOSE.scale;
  const dot = scene.actor('dot', 'dot', {x: CLOSE.dotX, y: CLOSE.dotY, scaleX: s, scaleY: s}, 'happy');
  const milo = scene.actor('milo', 'milo', {x: CLOSE.miloX, y: CLOSE.miloY, scaleX: s, scaleY: s}, 'happy');
  counterForeground(scene);
  const parcel = scene.actor('parcel', 'parcel', {x: 560, y: CLOSE.counterY - 80 * s, scaleX: s, scaleY: s});
  // Start tiny and centred on the parcel so the pop grows outward.
  const mug = scene.actor('mug', 'mug', {x: 642, y: 355, scaleX: 0.2, scaleY: 0.2, opacity: 0});

  scene.sound(0.7, 'sfx-rustle', 0.8, {gain: 0.9});
  parcel.move(0.7, 0.2, {rotation: -6}).move(0.9, 0.2, {rotation: 6}).move(1.1, 0.2, {rotation: -4}).move(1.3, 0.2, {rotation: 0});
  parcel.move(2.0, 0.25, {opacity: 0});
  scene.sound(2.1, 'sfx-pop', 0.3);
  mug.move(2.1, 0.4, {x: 560, y: CLOSE.counterY - 110 * s + 6, scaleX: s, scaleY: s, opacity: 1}, 'back.out(1.7)');

  milo.expression(2.2, 'surprised');
  milo.expression(3.3, 'neutral').say(3.5, 'line-milo-mug', 1.4, "It's a mug.");
  dot.say(5.4, 'line-dot-read', 1.564, 'Read the side.');
});
