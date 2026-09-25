import {defineScene} from 'zimba';
import {LOBBY, nightMusic} from './staging';

export default defineScene({id: 'closing-time', title: 'Closing time', environment: 'lobby', duration: 7}, scene => {
  nightMusic(scene, 7);
  const milo = scene.actor('milo', 'milo', {x: LOBBY.miloX, y: LOBBY.miloY});
  scene.actor('desk', 'desk', {x: LOBBY.deskX, y: LOBBY.deskY});
  const dot = scene.actor('dot', 'dot', {x: -220, y: LOBBY.dotY});
  const parcel = scene.actor('parcel', 'parcel', {x: -90, y: 485});

  scene.sound(0.6, 'sfx-chime', 1.15, {gain: 0.8});
  dot.move(0.8, 1.6, {x: 260}, 'power1.inOut');
  parcel.move(0.8, 1.6, {x: 390}, 'power1.inOut');

  milo.expression(0, 'neutral');
  milo.say(2.3, 'line-milo-closed', 4.405, "Sorry, we're closed. Oh. It's you.");
  milo.expression(4.6, 'surprised').expression(5.4, 'happy');
  dot.expression(5.6, 'happy');
});
