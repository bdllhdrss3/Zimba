import {parseArgs} from 'node:util';
import {resolve, dirname, relative} from 'node:path';
import {cp, mkdir, writeFile, access, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {frameworkRoot, inside, listAssets, listEpisodes, loadProduction, json, readFeedback} from './project';
import {id} from './schema';
import {serve} from './server';
import {capture, command, renderVideo, savePng} from './render';

async function main() {
  const {values, positionals} = parseArgs({allowPositionals: true, options: {show: {type: 'string'}, episode: {type: 'string'}, scene: {type: 'string'}, port: {type: 'string'}, text: {type: 'string'}, voice: {type: 'string'}, json: {type: 'boolean'}, help: {type: 'boolean'}, every: {type: 'string'}, width: {type: 'string'}, status: {type: 'string'}, note: {type: 'string'}}});
  const [action, name, extra] = positionals;
  const root = resolve(values.show ?? '.');
  if (!action || values.help) {
    console.log(`Zimba
  init <path>                          new show from the starter template
  episode new <id>                     new episode folder (reuses assets)
  assets [id] [--json]                 list asset IDs, capabilities, sources
  validate [--episode id]              typecheck-free validation of scenes/assets/timing
  preview [--episode id] [--port n]    live Studio (scene + world views, feedback)
  render [--episode id] [--scene id]   MP4 export to renders/
  stills [--episode id] [--scene id] [--every 1] [--width 320]   contact sheets for AI/human review
  sheet <asset-id>                     model sheet PNG (expressions, poses, mouth, anchors)
  lineup                               cast and props at true scale on the main set
  feedback [--status pending] [--json] list review proposals
  resolve <feedback-id> --status applied|rejected|needs-clarification --note "..."
  tts <asset-id> --text "Hello" [--voice "Microsoft George"]   offline dialogue audio asset
  voices                               list installed offline voices
  doctor
All commands accept --show <path> (default: current directory).`); return;
  }
  if (action === 'init') {
    if (!name) throw new Error('Provide a new show directory');
    const destination = resolve(name);
    try {await access(destination); throw new Error('Destination already exists; refusing to overwrite');}
    catch (error: any) {if (error.code !== 'ENOENT') throw error;}
    await cp(resolve(frameworkRoot, 'templates/show'), destination, {recursive: true, filter: path => !path.includes('.zimba')});
    await cp(resolve(frameworkRoot, 'docs'), resolve(destination, 'docs'), {recursive: true});
    await mkdir(resolve(destination, 'feedback'));
    await writeFile(resolve(destination, 'package.json'), JSON.stringify({name: 'zimba-show', private: true, type: 'module', scripts: {preview: 'zimba preview', validate: 'zimba validate', render: 'zimba render'}, dependencies: {zimba: `file:${relative(destination, frameworkRoot).replaceAll('\\', '/')}`}}, null, 2));
    console.log(`Created ${destination}. Run npm install there, then npm run preview.`); return;
  }
  if (action === 'doctor') {
    console.log(`Node ${process.version}`);
    await command('ffmpeg', ['-version']); console.log('FFmpeg available');
    const {chromium} = await import('playwright');
    const browser = await chromium.launch({channel: process.env.ZIMBA_BROWSER || 'msedge'});
    console.log(`Browser ${browser.version()}`); await browser.close(); return;
  }
  if (action === 'episode' && name === 'new') {
    id.parse(extra); const path = await inside(root, `episodes/${extra}`, false);
    await inside(root, 'episodes');
    await mkdir(path); await mkdir(resolve(path, 'scenes'));
    const assets = await listAssets(root); const environment = assets.find(asset => asset.type === 'environment');
    if (!environment) throw new Error('Add an environment before creating an episode');
    await writeFile(resolve(path, 'episode.json'), JSON.stringify({schemaVersion: 1, id: extra, title: extra, scenes: ['scenes/opening.ts']}, null, 2));
    await writeFile(resolve(path, 'story.md'), `# ${extra}\n\nDescribe the story, beats, dialogue and continuity here.\n`);
    await writeFile(resolve(path, 'scenes/opening.ts'), `import {defineScene} from 'zimba';\n\nexport default defineScene({id: 'opening', title: 'Opening', environment: '${environment.id}', duration: 5}, scene => {\n  scene.camera(0, 0, {x: 0, y: 0});\n});\n`);
    console.log(`Created ${path}; existing assets and episodes unchanged.`); return;
  }
  if (action === 'assets') {
    let assets = await listAssets(root); if (name) assets = assets.filter(asset => asset.id === name);
    console.log(JSON.stringify(assets.map(({media, shapes, ...asset}) => asset), null, 2)); return;
  }
  if (action === 'voices') {
    if (process.platform !== 'win32') throw new Error('Offline voices use Windows speech; import audio on other platforms.');
    execFileSync('powershell.exe', ['-NoProfile', '-File', resolve(frameworkRoot, 'tools/speech-winrt.ps1'), '-List'], {stdio: 'inherit', windowsHide: true}); return;
  }
  if (action === 'tts') {
    if (process.platform !== 'win32') throw new Error('Built-in speech preparation uses Windows speech; import audio on other platforms.');
    id.parse(name); if (!values.text) throw new Error('Provide --text');
    const directory = await inside(root, `assets/audio/${name}`, false);
    await mkdir(dirname(directory), {recursive: true}); await inside(root, 'assets/audio');
    try {await access(resolve(directory, 'asset.json')); throw new Error(`Audio asset ${name} already exists; choose a new id`);}
    catch (error: any) {if (error.code !== 'ENOENT') throw error;}
    await mkdir(directory, {recursive: true});
    const output = resolve(directory, 'speech.wav');
    const voiceArgs = values.voice ? ['-Voice', values.voice] : [];
    try {
      try {execFileSync('powershell.exe', ['-NoProfile', '-File', resolve(frameworkRoot, 'tools/speech-winrt.ps1'), '-Text', values.text, '-Output', output, ...voiceArgs], {stdio: ['ignore', 'inherit', 'pipe'], windowsHide: true});}
      catch (winrt: any) {
        try {execFileSync('powershell.exe', ['-NoProfile', '-File', resolve(frameworkRoot, 'tools/speech.ps1'), '-Text', values.text, '-Output', output, ...voiceArgs], {stdio: ['ignore', 'inherit', 'pipe'], windowsHide: true});}
        catch {throw new Error(`Speech generation failed. Run "zimba voices" to list usable voices.\n${String(winrt.stderr ?? winrt).trim()}`);}
      }
      const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', output], {encoding: 'utf8'}).trim());
      if (!(duration > 0)) throw new Error('Generated speech has no duration');
      await writeFile(resolve(directory, 'asset.json'), JSON.stringify({schemaVersion: 1, id: name, name, type: 'audio', description: values.text, tags: ['dialogue'], text: values.text, file: 'speech.wav', duration, provenance: `Windows offline voice${values.voice ? `: ${values.voice}` : ''}`}, null, 2));
      console.log(`Prepared ${name}: ${duration.toFixed(3)}s. Use actor.say(at, '${name}', ${Number(duration.toFixed(3))}, text).`); return;
    } catch (error) {await rm(directory, {recursive: true, force: true}); throw error;}
  }
  if (action === 'feedback') {
    const items = (await readFeedback(root)).filter(item => !values.status || item.status === values.status).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (values.json) {console.log(JSON.stringify(items, null, 2)); return;}
    for (const item of items) console.log(`${item.id}  [${item.status}]  ${item.episode}/${item.scene} frame ${item.frame}  target=${item.target ?? 'scene'}  ${item.kind}\n    ${item.text}${item.proposed ? `\n    proposed: ${JSON.stringify(item.proposed)}` : ''}${item.strokes ? `\n    sketch: ${item.strokes.length} stroke(s)` : ''}${item.resolution ? `\n    resolution: ${item.resolution}` : ''}`);
    if (!items.length) console.log('No feedback'); return;
  }
  if (action === 'resolve') {
    if (!name || !/^[0-9a-f-]{36}$/.test(name)) throw new Error('Provide a feedback id');
    if (!['applied', 'rejected', 'needs-clarification', 'pending'].includes(values.status ?? '')) throw new Error('--status applied|rejected|needs-clarification|pending');
    if (!values.note?.trim()) throw new Error('Provide --note explaining what was verified or why');
    const path = await inside(root, `feedback/${name}.json`);
    const item = await json(path);
    await writeFile(path, JSON.stringify({...item, status: values.status, resolution: values.note.trim(), resolvedAt: new Date().toISOString()}, null, 2) + '\n');
    console.log(`${name} -> ${values.status}`); return;
  }
  const episode = values.episode ?? (await listEpisodes(root))[0];
  if (!episode) throw new Error('No episodes found');
  if (action === 'stills' || action === 'sheet' || action === 'lineup') {
    const server = await serve(root, episode, 0, false);
    try {
      const production = server.production;
      const written = await capture(production, server.url, async page => {
        if (action === 'sheet') {
          if (!name || !production.assets.some(asset => asset.id === name)) throw new Error(`Unknown asset ${name}`);
          return [await savePng(root, 'sheets', name, await page.evaluate(id => (window as any).zimbaRender.sheet(id), name))];
        }
        if (action === 'lineup') return [await savePng(root, 'sheets', 'lineup', await page.evaluate(() => (window as any).zimbaRender.lineup()))];
        const scenes = values.scene ? production.scenes.filter(scene => scene.id === values.scene) : production.scenes;
        if (!scenes.length) throw new Error('Scene not found');
        const paths: string[] = [];
        for (const scene of scenes) paths.push(await savePng(root, `stills/${episode}`, scene.id, await page.evaluate(([sceneId, every, width]) => (window as any).zimbaRender.contact(sceneId, every, width), [scene.id, Number(values.every ?? 1), Number(values.width ?? 320)] as const)));
        return paths;
      });
      written.forEach(path => console.log(path));
    } finally {await server.close();}
    return;
  }
  if (action === 'validate') {
    const production = await loadProduction(root, episode);
    console.log(`Valid: ${production.scenes.length} scenes, ${production.assets.length} assets, ${production.scenes.reduce((sum, scene) => sum + scene.duration, 0)} seconds`); return;
  }
  if (action === 'preview' || action === 'render') {
    const server = await serve(root, episode, Number(values.port ?? 0), action === 'preview');
    if (action === 'render') {try {await renderVideo(root, server.production, server.url, values.scene);} finally {await server.close();}}
    else {
      console.log(`ZIMBA_URL=${server.url}`);
      process.on('SIGINT', () => {void server.close().then(() => process.exit(0));});
      process.on('SIGTERM', () => {void server.close().then(() => process.exit(0));});
    }
    return;
  }
  throw new Error(`Unknown command: ${action}`);
}
main().catch(error => {console.error(String(error)); process.exitCode = 1;});