import {readdir, readFile, mkdir, writeFile, realpath} from 'node:fs/promises';
import {resolve, relative, dirname, extname, isAbsolute, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {build} from 'esbuild';
import {assetSchema, projectSchema, episodeSchema, feedbackSchema, id, type Asset, type Feedback, type Production, type Shape} from './schema';
import {validateScenes} from './validation';

export const frameworkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function inside(root: string, path: string, existing = true): Promise<string> {
  const target = resolve(root, path);
  const check = (base: string, candidate: string) => {
    const rel = relative(base, candidate);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Path escapes project: ${path}`);
  };
  check(resolve(root), target);
  if (existing) check(await realpath(root), await realpath(target));
  return target;
}
export async function json(path: string): Promise<any> {
  try {return JSON.parse(await readFile(path, 'utf8'));}
  catch (error) {throw new Error(`${path}: ${String(error)}`);}
}
export async function files(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, {withFileTypes: true})) {
    if (entry.isSymbolicLink()) throw new Error(`Symlink not permitted in project data: ${entry.name}`);
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else result.push(path);
  }
  return result.sort();
}
async function media(root: string, path: string) {
  const absolute = await inside(root, path);
  const mime: Record<string, string> = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'};
  const type = mime[extname(absolute).toLowerCase()];
  if (!type) throw new Error(`Unsupported media format: ${absolute}`);
  return `data:${type};base64,${(await readFile(absolute)).toString('base64')}`;
}
export async function listAssets(root: string): Promise<Asset[]> {
  const manifestFiles = (await files(await inside(root, 'assets'))).filter(path => path.endsWith(`${sep}asset.json`));
  const assets: Asset[] = [];
  for (const path of manifestFiles) {
    const parsed = assetSchema.parse(await json(path));
    const asset: Asset = {...parsed, source: relative(root, path).split(sep).join('/')};
    if (asset.file) asset.media = await media(root, relative(root, resolve(dirname(path), asset.file)));
    const prepare = async (shapes: Shape[]) => {
      for (const shape of shapes) {
        if (shape.type === 'Image') {
          if (typeof shape.attrs.src !== 'string') throw new Error(`${asset.id}: Image needs attrs.src`);
          shape.attrs.src = await media(root, relative(root, resolve(dirname(path), shape.attrs.src)));
        }
        if (shape.children) await prepare(shape.children);
      }
    };
    await prepare(asset.shapes);
    assets.push(asset);
  }
  if (new Set(assets.map(asset => asset.id)).size !== assets.length) throw new Error('Duplicate asset IDs');
  return assets;
}
export async function listEpisodes(root: string) {
  const directories = await readdir(await inside(root, 'episodes'), {withFileTypes: true});
  return directories.filter(entry => entry.isDirectory()).map(entry => id.parse(entry.name)).sort();
}
export async function readFeedback(root: string): Promise<Feedback[]> {
  let paths: string[];
  try {paths = await files(await inside(root, 'feedback'));}
  catch (error: any) {if (error.code === 'ENOENT') return []; throw error;}
  return Promise.all(paths.filter(path => path.endsWith('.json')).map(path => json(path)));
}
export async function loadProduction(root: string, episodeId: string): Promise<Production> {
  id.parse(episodeId);
  const project = projectSchema.parse(await json(await inside(root, 'project.json')));
  const episodeRoot = await inside(root, `episodes/${episodeId}`);
  const episode = episodeSchema.parse(await json(await inside(episodeRoot, 'episode.json')));
  if (episode.id !== episodeId) throw new Error('Episode folder and manifest ID disagree');
  const scenePaths = await Promise.all(episode.scenes.map(path => inside(episodeRoot, path)));
  const bundled = await build({
    stdin: {contents: scenePaths.map((path, index) => `export {default as scene${index}} from ${JSON.stringify(path)};`).join('\n'), resolveDir: root},
    alias: {zimba: resolve(frameworkRoot, 'src/api.ts')},
    bundle: true, write: false, platform: 'node', format: 'esm', target: 'node22', logLevel: 'silent',
  });
  const code = bundled.outputFiles[0].text;
  const assets = await listAssets(root);
  const revision = createHash('sha256').update(code).update(JSON.stringify({project, episode, assets})).digest('hex');
  const cache = await inside(root, '.zimba', false);
  await mkdir(cache, {recursive: true});
  await inside(root, '.zimba');
  const modulePath = resolve(cache, `${createHash('sha256').update(code).digest('hex')}.mjs`);
  await writeFile(modulePath, code);
  const compiled = await import(pathToFileURL(modulePath).href);
  const scenes = scenePaths.map((_, index) => compiled[`scene${index}`]);
  validateScenes(scenes, assets, project);
  return {project, episode, assets, scenes, revision, feedback: await readFeedback(root)};
}
export async function saveFeedback(root: string, value: unknown, production: Production) {
  const input = feedbackSchema.parse(value);
  if (input.revision !== production.revision) throw new Error('Preview changed. Refresh before submitting this proposal.');
  if (input.episode !== production.episode.id) throw new Error('Episode mismatch');
  const scene = production.scenes.find(scene => scene.id === input.scene);
  if (!scene || input.frame >= Math.round(scene.duration * production.project.fps)) throw new Error('Invalid scene or frame');
  if (input.target && !['camera', ...scene.actors.map(actor => actor.id), ...scene.actions.map(action => action.id), ...scene.audio.map(cue => cue.id), ...production.assets.map(asset => asset.id)].includes(input.target)) throw new Error('Unknown feedback target');
  const directory = await inside(root, 'feedback', false);
  await mkdir(directory, {recursive: true});
  await inside(root, 'feedback');
  const feedback: Feedback = {...input, id: randomUUID(), createdAt: new Date().toISOString(), status: 'pending'};
  await writeFile(resolve(directory, `${feedback.id}.json`), JSON.stringify(feedback, null, 2) + '\n', {flag: 'wx'});
  return feedback;
}