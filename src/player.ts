import Konva from 'konva';
import {gsap} from 'gsap';
import type {Asset, Production, Scene, Shape, Transform} from './schema';

export async function drawShapes(parent: Konva.Container, shapes: Shape[]) {
  const constructors = {Group: Konva.Group, Rect: Konva.Rect, Circle: Konva.Circle, Ellipse: Konva.Ellipse, Line: Konva.Line, Text: Konva.Text, Path: Konva.Path, Image: Konva.Image};
  for (const shape of shapes) {
    const attrs: Record<string, unknown> = {...shape.attrs, listening: false};
    if (shape.type === 'Image') {
      const image = new Image();
      image.src = String(attrs.src);
      await image.decode();
      attrs.image = image;
      delete attrs.src;
    }
    const node = new (constructors[shape.type] as any)(attrs) as Konva.Node;
    node.setAttrs({zimbaExpression: shape.expression, zimbaPose: shape.pose, zimbaMouth: shape.mouth});
    parent.add(node);
    if (shape.children) await drawShapes(node as Konva.Container, shape.children);
  }
}
export function applyVariant(root: Konva.Container, expression: string, pose: string, mouth: 'open' | 'closed') {
  for (const node of root.find((node: Konva.Node) => Boolean(node.getAttr('zimbaExpression') || node.getAttr('zimbaPose') || node.getAttr('zimbaMouth')))) {
    node.visible((!node.getAttr('zimbaExpression') || node.getAttr('zimbaExpression') === expression) && (!node.getAttr('zimbaPose') || node.getAttr('zimbaPose') === pose) && (!node.getAttr('zimbaMouth') || node.getAttr('zimbaMouth') === mouth));
  }
}
async function drawAsset(parent: Konva.Group, asset: Asset) {
  await drawShapes(parent, asset.shapes);
  if (asset.type === 'reference' && asset.media) {
    const image = new Image(); image.src = asset.media; await image.decode();
    parent.add(new Konva.Image({image, width: asset.width, height: asset.height}));
  }
}
export async function thumbnail(asset: Asset) {
  const host = document.createElement('div');
  const stage = new Konva.Stage({container: host, width: 200, height: 132});
  const layer = new Konva.Layer(); stage.add(layer);
  layer.add(new Konva.Rect({width: 200, height: 132, fill: asset.type === 'audio' ? '#2f3f4e' : '#eff1f2'}));
  if (asset.type === 'audio') {
    const bars = Array.from({length: 22}, (_, index) => new Konva.Rect({x: 24 + index * 7, y: 50 - (index * 37 % 23), width: 4, height: 2 * (index * 37 % 23) + 6, fill: '#91dbb7', cornerRadius: 2}));
    layer.add(...bars, new Konva.Text({x: 10, y: 100, width: 180, text: `${asset.duration?.toFixed(2)}s`, align: 'center', fontFamily: 'Verdana', fontSize: 13, fill: '#dbe6ee'}));
  } else {
    const scale = Math.min(180 / asset.width, 115 / asset.height);
    const group = new Konva.Group({x: (200 - asset.width * scale) / 2, y: (132 - asset.height * scale) / 2, scaleX: scale, scaleY: scale});
    layer.add(group);
    await drawAsset(group, asset);
    applyVariant(group, asset.expressions[0] ?? 'neutral', asset.poses[0] ?? 'idle', 'closed');
  }
  layer.draw();
  const data = stage.toDataURL(); stage.destroy(); return data;
}

/** Every expression, pose and the speaking mouth side by side, with anchors, for world-building review. */
export async function modelSheet(asset: Asset) {
  if (asset.type === 'audio') throw new Error(`${asset.id} is audio and has no visual sheet`);
  const expressions = asset.expressions.length ? asset.expressions : ['neutral'];
  const poses = asset.poses.length ? asset.poses : ['idle'];
  const variants: {label: string; expression: string; pose: string; mouth: 'open' | 'closed'}[] = [];
  if (asset.expressions.length || asset.poses.length) {
    if (asset.expressions.length) for (const expression of expressions) variants.push({label: `expression: ${expression}`, expression, pose: poses[0], mouth: 'closed'});
    else variants.push({label: `pose: ${poses[0]}`, expression: expressions[0], pose: poses[0], mouth: 'closed'});
    for (const pose of poses.slice(1)) variants.push({label: `pose: ${pose}`, expression: expressions[0], pose, mouth: 'closed'});
    if (asset.type === 'character') variants.push({label: 'mouth: open (speaking)', expression: expressions[0], pose: poses[0], mouth: 'open'});
  } else variants.push({label: asset.type, expression: 'neutral', pose: 'idle', mouth: 'closed'});
  const wide = asset.type === 'environment';
  const scale = Math.min((wide ? 1200 : 240) / asset.width, (wide ? 675 : 280) / asset.height, wide ? 1 : 1.6);
  const cellWidth = asset.width * scale + 60, cellHeight = asset.height * scale + 70;
  const columns = Math.max(1, Math.min(variants.length, Math.floor(1320 / cellWidth)));
  const width = columns * cellWidth, height = Math.ceil(variants.length / columns) * cellHeight + 60;
  const stage = new Konva.Stage({container: document.createElement('div'), width, height});
  const layer = new Konva.Layer(); stage.add(layer);
  layer.add(new Konva.Rect({width, height, fill: '#f4f1e8'}));
  layer.add(new Konva.Text({x: 24, y: 20, text: `${asset.name}  (${asset.id}, ${asset.type}, ${asset.width} x ${asset.height})`, fontFamily: 'Verdana', fontSize: 17, fill: '#26343a'}));
  for (const [index, variant] of variants.entries()) {
    const x = (index % columns) * cellWidth + 30, y = 60 + Math.floor(index / columns) * cellHeight;
    layer.add(new Konva.Rect({x, y, width: asset.width * scale, height: asset.height * scale, stroke: '#cfc8b6', dash: [6, 4], strokeWidth: 1}));
    const group = new Konva.Group({x, y, scaleX: scale, scaleY: scale}); layer.add(group);
    await drawAsset(group, asset);
    applyVariant(group, variant.expression, variant.pose, variant.mouth);
    for (const [name, point] of Object.entries(asset.anchors)) {
      layer.add(new Konva.Circle({x: x + point.x * scale, y: y + point.y * scale, radius: 5, stroke: '#d9453b', strokeWidth: 2}));
      layer.add(new Konva.Text({x: x + point.x * scale + 7, y: y + point.y * scale - 6, text: `${name} (${point.x}, ${point.y})`, fontFamily: 'Verdana', fontSize: 11, fill: '#d9453b'}));
    }
    layer.add(new Konva.Text({x, y: y + asset.height * scale + 12, width: asset.width * scale, text: variant.label, align: 'center', fontFamily: 'Verdana', fontSize: 13, fill: '#26343a'}));
  }
  layer.draw();
  const url = stage.toDataURL(); stage.destroy();
  return {url, width, height};
}

/** Characters and props at true scene scale on the first environment, so relative sizes can be judged. */
export async function lineup(production: Production) {
  const {width, height} = production.project;
  const stage = new Konva.Stage({container: document.createElement('div'), width, height});
  const layer = new Konva.Layer(); stage.add(layer);
  const environment = production.assets.find(asset => asset.type === 'environment');
  const background = new Konva.Group(); layer.add(background);
  if (environment) await drawAsset(background, environment); else layer.add(new Konva.Rect({width, height, fill: '#e9eadf'}));
  const floor = environment?.anchors.floor?.y ?? height * 0.83;
  const cast = production.assets.filter(asset => asset.type === 'character' || asset.type === 'prop');
  const gap = width / (cast.length + 1);
  for (const [index, asset] of cast.entries()) {
    const group = new Konva.Group({x: gap * (index + 1) - asset.width / 2, y: floor - asset.height}); layer.add(group);
    await drawAsset(group, asset); applyVariant(group, asset.expressions[0] ?? 'neutral', asset.poses[0] ?? 'idle', 'closed');
    const label = new Konva.Label({x: gap * (index + 1), y: floor + 12}); layer.add(label);
    label.add(new Konva.Tag({fill: '#26343a', cornerRadius: 3, pointerDirection: 'up', pointerWidth: 10, pointerHeight: 6}));
    label.add(new Konva.Text({text: `${asset.name} (${asset.id})`, padding: 5, fontFamily: 'Verdana', fontSize: 13, fill: '#f4f1e8'}));
  }
  layer.draw();
  const url = stage.toDataURL(); stage.destroy();
  return {url, width, height};
}

export class Player {
  stage: Konva.Stage;
  layer = new Konva.Layer();
  overlay = new Konva.Layer();
  world = new Konva.Group();
  actors = new Map<string, Konva.Group>();
  states = new Map<string, Transform>();
  camera: Transform = {x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1};
  timelines: gsap.core.Timeline[] = [];
  audio: {cue: Scene['audio'][number]; element: HTMLAudioElement}[] = [];
  scene!: Scene;
  time = 0;
  constructor(container: HTMLDivElement, public production: Production, scale = 1) {
    Konva.pixelRatio = 1;
    this.stage = new Konva.Stage({container, width: production.project.width * scale, height: production.project.height * scale, scaleX: scale, scaleY: scale});
    this.stage.add(this.layer, this.overlay); this.layer.add(this.world);
  }
  async load(scene: Scene) {
    this.pauseAudio();
    this.audio = [];
    this.timelines.forEach(timeline => timeline.kill()); this.timelines = [];
    this.world.destroyChildren(); this.overlay.destroyChildren(); this.actors.clear(); this.states.clear();
    this.camera = {x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1};
    this.scene = scene;
    const assets = new Map(this.production.assets.map(asset => [asset.id, asset]));
    await drawShapes(this.world, assets.get(scene.environment)!.shapes);
    for (const actor of scene.actors) {
      const group = new Konva.Group({...actor.initial, id: actor.id, name: 'actor'});
      this.world.add(group); await drawShapes(group, assets.get(actor.asset)!.shapes);
      this.actors.set(actor.id, group); this.states.set(actor.id, {...actor.initial});
    }
    const clock = {value: 0};
    const motion = gsap.timeline({paused: true}).to(clock, {value: scene.duration, duration: scene.duration, ease: 'none'}, 0);
    const cameraTimeline = gsap.timeline({paused: true}).to({value: 0}, {value: scene.duration, duration: scene.duration, ease: 'none'}, 0);
    for (const action of [...scene.actions].sort((first, second) => first.at - second.at)) {
      if (action.kind !== 'move' && action.kind !== 'camera') continue;
      const timeline = action.kind === 'camera' ? cameraTimeline : motion;
      const state = action.kind === 'camera' ? this.camera : this.states.get(action.target)!;
      timeline.to(state, {...action.values, duration: action.duration, ease: action.ease, immediateRender: false}, action.at);
    }
    this.timelines = [motion, cameraTimeline];
    this.audio = scene.audio.map(cue => ({cue, element: new Audio(assets.get(cue.asset)!.media)}));
    this.seek(0);
  }
  seek(time: number, sound = false) {
    this.time = Math.max(0, Math.min(time, this.scene.duration));
    const held = Math.floor((this.time + 1e-7) * this.production.project.poseFps) / this.production.project.poseFps;
    this.timelines[0].seek(held, true); this.timelines[1].seek(this.time, true);
    this.world.setAttrs(this.camera);
    for (const actor of this.scene.actors) {
      const group = this.actors.get(actor.id)!; group.setAttrs(this.states.get(actor.id)!);
      let expression = actor.expression; let pose = actor.pose;
      for (const action of [...this.scene.actions].sort((first, second) => first.at - second.at)) {
        if (action.target !== actor.id || action.at > held) continue;
        if (action.kind === 'expression') expression = action.value!;
        if (action.kind === 'pose') pose = action.value!;
      }
      const speaking = this.scene.audio.some(cue => cue.actor === actor.id && this.time >= cue.at && this.time < cue.at + cue.duration);
      const mouth = speaking && Math.floor(held * 8) % 3 !== 0 ? 'open' : 'closed';
      applyVariant(group, expression, pose, mouth);
    }
    for (const {cue, element} of this.audio) {
      const active = sound && this.time >= cue.at && this.time < cue.at + cue.duration;
      if (!active) {element.pause(); continue;}
      element.volume = Math.min(1, cue.gain);
      const local = this.time - cue.at;
      if (Math.abs(element.currentTime - local) > 0.15) element.currentTime = local;
      if (element.paused) void element.play().catch(() => {});
    }
    this.layer.draw();
  }
  pauseAudio() {this.audio.forEach(({element}) => element.pause());}
  resize(scale: number) {
    this.stage.size({width: this.production.project.width * scale, height: this.production.project.height * scale});
    this.stage.scale({x: scale, y: scale}); this.stage.draw();
  }
  frame() {return this.layer.toDataURL({pixelRatio: 1});}
  destroy() {this.pauseAudio(); this.timelines.forEach(timeline => timeline.kill()); this.stage.destroy();}
}