import {sceneSchema, type Asset, type Project, type Scene} from './schema';

export function validateScenes(scenes: Scene[], assets: Asset[], project: Project) {
  const catalog = new Map(assets.map(asset => [asset.id, asset]));
  if (catalog.size !== assets.length) throw new Error('Duplicate asset IDs');
  if (new Set(scenes.map(scene => scene.id)).size !== scenes.length) throw new Error('Duplicate scene IDs');
  for (const raw of scenes) {
    const scene = sceneSchema.parse(raw);
    const fail = (message: string): never => {throw new Error(`${scene.id}: ${message}`);};
    if (Math.abs(scene.duration * project.fps - Math.round(scene.duration * project.fps)) > 1e-6) fail('duration must align to an output frame');
    if (catalog.get(scene.environment)?.type !== 'environment') fail(`Missing environment ${scene.environment}`);
    const instances = new Map(scene.actors.map(actor => [actor.id, actor]));
    if (instances.size !== scene.actors.length) fail('Duplicate instance IDs');
    if (new Set(scene.actions.map(action => action.id)).size !== scene.actions.length) fail('Duplicate action IDs');
    if (new Set(scene.audio.map(cue => cue.id)).size !== scene.audio.length) fail('Duplicate cue IDs');
    for (const actor of scene.actors) {
      const asset = catalog.get(actor.asset);
      if (!asset || !['character', 'prop'].includes(asset.type)) fail(`Missing character/prop ${actor.asset}`);
      if (asset!.expressions.length && !asset!.expressions.includes(actor.expression)) fail(`Unknown expression ${actor.expression} on ${actor.asset}`);
      if (asset!.poses.length && !asset!.poses.includes(actor.pose)) fail(`Unknown pose ${actor.pose} on ${actor.asset}`);
    }
    const channels = new Map<string, {start: number; end: number}[]>();
    for (const action of scene.actions) {
      if (action.at + action.duration > scene.duration + 1e-7) fail(`${action.id} overruns scene`);
      if (action.kind !== 'camera' && !instances.has(action.target)) fail(`Unknown target ${action.target}`);
      if (action.kind === 'expression' || action.kind === 'pose') {
        const asset = catalog.get(instances.get(action.target)!.asset)!;
        const allowed = action.kind === 'expression' ? asset.expressions : asset.poses;
        if (!action.value || !allowed.includes(action.value)) fail(`${action.id}: unknown ${action.kind} ${action.value}`);
      } else {
        if (!action.values || !Object.keys(action.values).length) fail(`${action.id}: empty transform`);
        for (const channel of Object.keys(action.values!)) {
          const key = `${action.kind === 'camera' ? 'camera' : action.target}:${channel}`;
          const previous = channels.get(key) ?? [];
          if (previous.some(range => action.at < range.end && action.at + action.duration > range.start)) fail(`${action.id}: overlapping writes to ${key}`);
          previous.push({start: action.at, end: action.at + action.duration});
          channels.set(key, previous);
        }
      }
    }
    for (const cue of scene.audio) {
      const asset = catalog.get(cue.asset);
      if (!asset || asset.type !== 'audio') fail(`Missing audio ${cue.asset}`);
      if (cue.at + cue.duration > scene.duration + 1e-7) fail(`${cue.id}: audio overruns scene`);
      if (asset!.duration! + 0.05 < cue.duration) fail(`${cue.id}: requested audio exceeds source duration`);
      if (cue.actor && !instances.has(cue.actor)) fail(`${cue.id}: unknown speaker ${cue.actor}`);
    }
  }
}