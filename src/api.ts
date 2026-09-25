import {sceneSchema, type Scene, type Transform} from './schema';
export type {Asset, Shape, Scene, Project} from './schema';

const initialTransform: Transform = {x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1};
export type Ease = 'none' | 'power1.inOut' | 'back.out(1.7)';

export class Actor {
  constructor(private owner: SceneBuilder, public readonly id: string) {}
  move(at: number, duration: number, values: Partial<Transform>, ease: Ease = 'none') {
    this.owner.action({kind: 'move', target: this.id, at, duration, values, ease});
    return this;
  }
  expression(at: number, value: string) {
    this.owner.action({kind: 'expression', target: this.id, at, duration: 0, value, ease: 'none'});
    return this;
  }
  pose(at: number, value: string) {
    this.owner.action({kind: 'pose', target: this.id, at, duration: 0, value, ease: 'none'});
    return this;
  }
  say(at: number, asset: string, duration: number, text: string, gain = 1) {
    this.owner.sound(at, asset, duration, {actor: this.id, text, gain});
    return this;
  }
}

export class SceneBuilder {
  readonly data: Scene;
  constructor(options: Pick<Scene, 'id' | 'title' | 'environment' | 'duration'>) {
    this.data = {...options, actors: [], actions: [], audio: []};
  }
  actor(id: string, asset: string, transform: Partial<Transform> = {}, expression = 'neutral', pose = 'idle') {
    if (this.data.actors.some(actor => actor.id === id)) throw new Error(`Duplicate instance: ${id}`);
    this.data.actors.push({id, asset, initial: {...initialTransform, ...transform}, expression, pose});
    return new Actor(this, id);
  }
  action(action: Omit<Scene['actions'][number], 'id'> & {id?: string}) {
    this.data.actions.push({...action, id: action.id ?? `action-${this.data.actions.length + 1}`});
  }
  camera(at: number, duration: number, values: Partial<Transform>, ease: Ease = 'power1.inOut') {
    this.action({kind: 'camera', target: 'camera', at, duration, values, ease});
  }
  sound(at: number, asset: string, duration: number, options: {actor?: string; text?: string; gain?: number} = {}) {
    this.data.audio.push({id: `cue-${this.data.audio.length + 1}`, asset, at, duration, gain: 1, ...options});
  }
}

export function defineScene(options: Pick<Scene, 'id' | 'title' | 'environment' | 'duration'>, compose: (scene: SceneBuilder) => void): Scene {
  const builder = new SceneBuilder(options);
  compose(builder);
  return sceneSchema.parse(builder.data);
}