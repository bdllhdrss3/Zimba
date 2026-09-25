import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defineScene} from '../src/api';
import {assetSchema, feedbackSchema, projectSchema, type Asset} from '../src/schema';
import {validateScenes} from '../src/validation';

const project = projectSchema.parse({schemaVersion: 1, id: 'test', title: 'Test', width: 1280, height: 720, fps: 24, poseFps: 8});
const assets: Asset[] = [
  {...assetSchema.parse({schemaVersion: 1, id: 'room', name: 'Room', type: 'environment', description: ''}), source: 'assets/room/asset.json'},
  {...assetSchema.parse({schemaVersion: 1, id: 'bob', name: 'Bob', type: 'character', description: '', expressions: ['neutral', 'happy']}), source: 'assets/bob/asset.json'},
];
test('code authored scenes reuse assets with separate instances', () => {
  const scene = defineScene({id: 'opening', title: 'Opening', environment: 'room', duration: 5}, scene => {
    scene.actor('bob-one', 'bob').move(0, 2, {x: 100}).expression(2, 'happy');
    scene.actor('bob-two', 'bob', {x: 300});
  });
  validateScenes([scene], assets, project);
  assert.equal(scene.actors.length, 2);
  assert.equal(scene.actors[1].initial.x, 300);
});
test('missing assets, overruns, unknown expressions and competing writes fail', () => {
  const make = (compose: Parameters<typeof defineScene>[1]) => defineScene({id: 'opening', title: '', environment: 'room', duration: 5}, compose);
  assert.throws(() => validateScenes([make(scene => {scene.actor('actor', 'missing');})], assets, project), /Missing/);
  assert.throws(() => validateScenes([make(scene => {scene.actor('actor', 'bob').move(4, 2, {x: 2});})], assets, project), /overruns/);
  assert.throws(() => validateScenes([make(scene => {scene.actor('actor', 'bob').expression(2, 'unknown');})], assets, project), /unknown expression/);
  assert.throws(() => validateScenes([make(scene => {scene.actor('actor', 'bob').move(0, 3, {x: 2}).move(1, 3, {x: 3});})], assets, project), /overlapping/);
});
test('feedback needs revision, bounded data and an actual request', () => {
  const valid = {episode: 'pilot', scene: 'opening', revision: 'a'.repeat(64), frame: 12, kind: 'comment', text: 'Hold this pose longer'};
  assert.equal(feedbackSchema.parse(valid).frame, 12);
  assert.throws(() => feedbackSchema.parse({...valid, revision: 'old'}));
  assert.throws(() => feedbackSchema.parse({...valid, frame: -1}));
  assert.throws(() => feedbackSchema.parse({...valid, text: ''}));
  assert.throws(() => feedbackSchema.parse({...valid, arbitraryPath: '../../file'}));
});