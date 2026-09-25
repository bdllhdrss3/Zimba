import {defineScene} from 'zimba';

export default defineScene({id: 'reveal', title: 'Something very small', environment: 'lobby', duration: 6}, scene => {
  const milo = scene.actor('milo', 'milo', {x: 650, y: 345}, 'happy');
  const dot = scene.actor('dot', 'dot', {x: 420, y: 380}, 'happy');
  const parcel = scene.actor('parcel', 'parcel', {x: 556, y: 510});
  parcel.move(0.5, 1, {y: 557, scaleX: 0.55, scaleY: 0.55}, 'power1.inOut');
  milo.expression(1.5, 'surprised').move(1.5, 0.5, {rotation: -8});
  scene.camera(0, 2, {scaleX: 1.12, scaleY: 1.12, x: -70, y: -65});
  milo.expression(3.5, 'happy').move(3.5, 0.5, {rotation: 0});
  dot.pose(3.5, 'wave');
});