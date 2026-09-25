import {defineScene} from 'zimba';

export default defineScene({id: 'arrival', title: 'A late delivery', environment: 'lobby', duration: 6}, scene => {
  const milo = scene.actor('milo', 'milo', {x: 710, y: 345});
  const dot = scene.actor('dot', 'dot', {x: 80, y: 380});
  const parcel = scene.actor('parcel', 'parcel', {x: 216, y: 510});
  dot.move(0.5, 2, {x: 420}, 'power1.inOut');
  parcel.move(0.5, 2, {x: 556}, 'power1.inOut');
  milo.pose(2.5, 'wave').expression(2.5, 'happy');
  milo.move(3, 1.5, {x: 650}, 'power1.inOut').pose(4.5, 'idle');
  dot.expression(4, 'happy');
});