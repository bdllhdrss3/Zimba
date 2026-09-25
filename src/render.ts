import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir, writeFile, rename, rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import type {Production} from './schema';
import {inside} from './project';

export async function command(program: string, args: string[]) {
  const child = spawn(program, args, {windowsHide: true});
  let error = '';
  child.stderr.on('data', data => error += data.toString());
  child.stdout.resume();
  await new Promise<void>((done, reject) => {
    child.once('error', reject);
    child.once('close', code => code === 0 ? done() : reject(new Error(`${program}: ${error}`)));
  });
}
export async function capture<T>(production: Production, url: string, work: (page: import('playwright').Page) => Promise<T>) {
  const browser = await chromium.launch({channel: process.env.ZIMBA_BROWSER || 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: production.project.width, height: production.project.height}});
    await page.goto(`${url}&render=1`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => Boolean((window as any).zimbaRender));
    return await work(page);
  } finally {await browser.close();}
}
export async function savePng(root: string, folder: string, name: string, dataUrl: string) {
  const directory = await inside(root, `renders/${folder}`, false);
  await mkdir(directory, {recursive: true}); await inside(root, 'renders');
  const path = resolve(directory, `${name}.png`);
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return path;
}
export async function renderVideo(root: string, production: Production, url: string, onlyScene?: string) {
  const scenes = onlyScene ? production.scenes.filter(scene => scene.id === onlyScene) : production.scenes;
  if (!scenes.length) throw new Error('Scene not found');
  await command('ffmpeg', ['-version']);
  const destination = await inside(root, 'renders', false);
  await mkdir(destination, {recursive: true}); await inside(root, 'renders');
  const work = resolve(await inside(root, '.zimba'), `render-${randomUUID()}`);
  await mkdir(work);
  const browser = await chromium.launch({channel: process.env.ZIMBA_BROWSER || 'msedge', headless: true});
  const started = performance.now();
  try {
    const page = await browser.newPage({viewport: {width: production.project.width, height: production.project.height}});
    await page.goto(`${url}&render=1`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => Boolean((window as any).zimbaRender));
    const loadedRevision = await page.evaluate(() => (window as any).zimbaRender.revision);
    if (loadedRevision !== production.revision) throw new Error('Source changed before rendering. Retry after edits finish.');
    const clips: string[] = [];
    for (const [index, scene] of scenes.entries()) {
      await page.evaluate(id => (window as any).zimbaRender.load(id), scene.id);
      const raw = resolve(work, `raw-${index}.mp4`);
      const encoder = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(production.project.fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-pix_fmt', 'yuv420p', raw], {windowsHide: true});
      let error = ''; encoder.stderr.on('data', data => error += data.toString());
      const completed = new Promise<void>((done, reject) => {
        encoder.once('error', reject);
        encoder.once('close', code => code === 0 ? done() : reject(new Error(`Frame encoder: ${error}`)));
      });
      let encoderError: Error | undefined;
      encoder.stdin.on('error', error => {encoderError = error;});
      try {
        for (let frame = 0; frame < Math.round(scene.duration * production.project.fps); frame++) {
          if (encoderError) throw encoderError;
          const png = await page.evaluate(time => (window as any).zimbaRender.frame(time), frame / production.project.fps);
          if (!encoder.stdin.write(Buffer.from(png.split(',')[1], 'base64'))) await once(encoder.stdin, 'drain');
        }
        encoder.stdin.end(); await completed;
      } catch (error) {encoder.kill(); await completed.catch(() => {}); throw error;}
      const audioArgs: string[] = ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];
      const filters: string[] = [];
      for (const [cueIndex, cue] of scene.audio.entries()) {
        const asset = production.assets.find(asset => asset.id === cue.asset)!;
        const audioFile = resolve(work, `audio-${index}-${cueIndex}`);
        await writeFile(audioFile, Buffer.from(asset.media!.split(',')[1], 'base64'));
        audioArgs.push('-i', audioFile);
        filters.push(`[${cueIndex + 2}:a]atrim=duration=${cue.duration},asetpts=PTS-STARTPTS,volume=${cue.gain},adelay=${Math.round(cue.at * 1000)}:all=1[a${cueIndex}]`);
      }
      filters.push(`[1:a]${scene.audio.map((_, cueIndex) => `[a${cueIndex}]`).join('')}amix=inputs=${scene.audio.length + 1}:normalize=0:duration=first,alimiter=limit=0.95:level=false[mix]`);
      const clip = resolve(work, `scene-${index}.mp4`);
      await command('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, ...audioArgs, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[mix]', '-t', String(scene.duration), '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2', clip]);
      clips.push(clip);
      console.log(`Rendered ${scene.id}: ${scene.duration}s`);
    }
    const playlist = resolve(work, 'concat.txt');
    await writeFile(playlist, clips.map(path => `file '${path.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`).join('\n'));
    const temporary = resolve(work, 'final.mp4');
    await command('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', playlist, '-c', 'copy', '-movflags', '+faststart', temporary]);
    const output = resolve(destination, `${production.episode.id}${onlyScene ? `-${onlyScene}` : ''}.mp4`);
    await rename(temporary, output);
    console.log(`Export: ${output} (${((performance.now() - started) / 1000).toFixed(1)}s)`);
    return output;
  } finally {await browser.close(); await rm(work, {recursive: true, force: true});}
}