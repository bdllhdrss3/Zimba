import {defineScene} from 'zimba';
import {LOBBY, nightMusic} from './staging';

export default defineScene({id: 'delivery', title: 'Special delivery', environment: 'lobby', duration: 8}, scene => {
  nightMusic(scene, 8);
  const milo = scene.actor('milo', 'milo', {x: LOBBY.miloX, y: LOBBY.miloY}, 'happy');
  scene.actor('desk', 'desk', {x: LOBBY.deskX, y: LOBBY.deskY});
  const dot = scene.actor('dot', 'dot', {x: 260, y: LOBBY.dotY}, 'happy');
  const parcel = scene.actor('parcel', 'parcel', {x: 390, y: 485});

  dot.move(0.3, 0.8, {x: 400}, 'power1.inOut');
  parcel.move(0.3, 0.8, {x: 530}, 'power1.inOut');
  dot.say(1.3, 'line-dot-delivery', 3.949, 'Special delivery. Extremely special.');
  milo.expression(2.2, 'surprised');

  parcel.move(5.4, 0.5, {x: 598, y: 413, scaleX: 0.6, scaleY: 0.6}, 'back.out(1.7)');
  scene.sound(5.9, 'sfx-thud', 0.4);
  dot.pose(5.4, 'wave').pose(6.2, 'idle');
  milo.expression(6.0, 'happy');
  scene.camera(4.8, 2.2, {scaleX: 1.25, scaleY: 1.25, x: -235, y: -165});
});
