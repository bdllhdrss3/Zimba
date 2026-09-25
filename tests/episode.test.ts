import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, cp, readFile, writeFile, rm, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium, type Page} from 'playwright';
import {serve} from '../src/server';
import {loadProduction, readFeedback} from '../src/project';
import {renderVideo} from '../src/render';

const cli = (root: string, ...args: string[]) => execFileSync('node', ['dist/cli.mjs', ...args, '--show', root], {encoding: 'utf8'});
const evaluate = <T>(page: Page, body: string) => page.evaluate(`(() => { const z = window.zimbaTest; ${body} })()`) as Promise<T>;

test('30-second episode: every Studio feature in real time, then full export', {timeout: 300000}, async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'zimba episode '));
  await cp('examples/small-hours', root, {recursive: true, filter: path => !/[\\/](renders|feedback|\.zimba|node_modules)([\\/]|$)/.test(path)});
  await mkdir(resolve(root, 'feedback'));
  const report: string[] = [];
  const server = await serve(root, 'night-shift');
  const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required']});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 960}});
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(server.url);
    await page.waitForFunction(() => Boolean((window as any).zimbaTest));

    // Episode structure
    assert.equal(await page.locator('.scene-chip').count(), 4);
    assert.equal(await page.locator('.asset').count(), 18);
    const total = await evaluate<number>(page, 'return z.production.scenes.reduce((sum, s) => sum + s.duration, 0);');
    assert.equal(total, 30); report.push('4 scenes, 18 assets, 30.0s loaded in Studio');

    // Real-time playback with audio
    await page.locator('#play').click();
    await page.waitForTimeout(2000);
    const played = await evaluate<{time: number; playing: boolean; music: boolean}>(page, "return {time: z.time, playing: z.playing, music: z.player.audio.some(a => a.cue.asset === 'music-night' && !a.element.paused)};");
    await page.locator('#play').click();
    assert.ok(played.playing && played.time > 1.6 && played.time < 2.5, `Playback advanced ${played.time}s in 2s wall time`);
    assert.ok(played.music, 'Music cue is audibly playing during preview');
    report.push(`Real-time playback: ${played.time.toFixed(2)}s of scene time in 2.00s wall time, music element playing`);

    // Limited animation: characters hold for 1/8s, camera stays smooth
    const holds = await evaluate<number[]>(page, "const x = t => { z.seek(t); return z.player.actors.get('dot').x(); }; return [x(1.0), x(1.1), x(1.13)];");
    assert.equal(holds[0], holds[1], 'Character pose held within one 8fps step');
    assert.notEqual(holds[1], holds[2], 'Character moves on the next 8fps step');
    report.push(`8fps pose holds: dot.x ${holds.map(v => v.toFixed(1)).join(' / ')} at 1.00 / 1.10 / 1.13s`);

    // Mouth animation only while speaking
    const mouth = await evaluate<{during: string[]; before: string[]}>(page, "const m = t => { z.seek(t); return z.player.actors.get('milo').find(n => n.getAttr('zimbaMouth') === 'open')[0].isVisible() ? 'open' : 'closed'; }; return {during: [3.0, 3.13, 3.26, 3.38, 3.51, 3.63].map(m), before: [0.5, 1.5, 2.2].map(m)};");
    assert.ok(mouth.during.includes('open') && mouth.during.includes('closed'), `Mouth cycles while speaking: ${mouth.during}`);
    assert.deepEqual(mouth.before, ['closed', 'closed', 'closed']);
    report.push(`Mouth during speech: ${mouth.during.join(',')}; before speech: all closed`);

    // Scene switching, camera smoothness and timeline cues
    await page.locator('.scene-chip').nth(1).click();
    await page.waitForFunction(() => document.querySelector('#scene-title')?.textContent === 'Special delivery');
    const camera = await evaluate<number[]>(page, 'const c = t => { z.seek(t); return z.player.world.scaleX(); }; return [c(5.0), c(5.04), c(7.5)];');
    assert.notEqual(camera[0], camera[1], 'Camera interpolates every output frame');
    assert.ok(Math.abs(camera[2] - 1.25) < 1e-6, 'Camera reaches its authored zoom');
    report.push(`Camera zoom ${camera.map(v => v.toFixed(4)).join(' / ')} at 5.00 / 5.04 / 7.50s (smooth, lands at 1.25)`);
    const cueCount = await page.locator('#tracks .cue').count();
    assert.ok(cueCount >= 10, `Timeline shows ${cueCount} cues`);
    await page.locator('#tracks .cue.audio').nth(1).click();
    const cue = await evaluate<{time: number; target: string}>(page, "return {time: z.time, target: document.querySelector('#target').value};");
    assert.equal(cue.target, 'cue-2'); assert.ok(Math.abs(cue.time - 1.3) < 0.05);
    report.push(`Timeline: ${cueCount} cues; clicking dialogue cue seeks to ${cue.time.toFixed(2)}s and selects ${cue.target}`);

    // Timeline drag proposal
    const source = page.locator('#tracks .cue.audio').nth(1);
    const lane = page.locator('#tracks .track').last().locator('.lane');
    const box = (await lane.boundingBox())!;
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await source.dispatchEvent('dragstart', {dataTransfer: transfer});
    await lane.dispatchEvent('drop', {dataTransfer: transfer, clientX: box.x + box.width * 0.25, clientY: box.y + 5});
    await page.getByRole('button', {name: 'Save proposal'}).click();
    await page.waitForFunction(() => document.querySelector('#feedback-count')?.textContent === '1');

    // Canvas transform proposal on a character
    await page.locator('.scene-chip').nth(0).click();
    await page.waitForFunction(() => document.querySelector('#scene-title')?.textContent === 'Closing time');
    await evaluate(page, "z.seek(5.5); z.select('dot');");
    await page.locator('#pos-x').fill('330'); await page.locator('#pos-x').dispatchEvent('change');
    await page.locator('#expression').selectOption('surprised');
    await page.locator('#comment').fill('Dot should step closer and look surprised here.');
    await page.getByRole('button', {name: 'Save proposal'}).click();
    await page.waitForFunction(() => document.querySelector('#feedback-count')?.textContent === '2');

    // Sketch proposal
    await page.locator('[data-tool="pen"]').click();
    const canvasBox = (await page.locator('#canvas canvas').first().boundingBox())!;
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++) await page.mouse.move(canvasBox.x + canvasBox.width * (0.3 + step * 0.03), canvasBox.y + canvasBox.height * (0.3 + step * 0.01));
    await page.mouse.up();
    await page.locator('#comment').fill('Add a wall poster here.');
    await page.getByRole('button', {name: 'Save proposal'}).click();
    await page.waitForFunction(() => document.querySelector('#feedback-count')?.textContent === '3');
    await page.locator('[data-tool="select"]').click();

    // Settings proposal leaves project.json untouched
    const projectBefore = await readFile(resolve(root, 'project.json'), 'utf8');
    await page.locator('#settings summary').click();
    await page.locator('#width').fill('1920'); await page.locator('#height').fill('1080');
    await page.locator('#propose-settings').click();
    await page.getByRole('button', {name: 'Save proposal'}).click();
    await page.waitForFunction(() => document.querySelector('#feedback-count')?.textContent === '4');
    assert.equal(await readFile(resolve(root, 'project.json'), 'utf8'), projectBefore);

    // World view: lineup, model sheet, audio audition, asset feedback
    await page.getByRole('tab', {name: 'World'}).click();
    await page.waitForFunction(() => (document.querySelector('#world-image') as HTMLImageElement)?.src.startsWith('data:image/png'));
    assert.match(await page.locator('#scene-title').textContent() ?? '', /cast lineup/);
    await page.getByRole('tab', {name: 'Props'}).click();
    await page.locator('.asset[data-asset="mug"]').click();
    await page.waitForFunction(() => document.querySelector('#scene-title')?.textContent === 'Model sheet: Okayest mug');
    await page.screenshot({path: '.zimba/verification/world-mug.png'});
    await page.locator('#comment').fill('Make the slogan text slightly larger.');
    await page.getByRole('button', {name: 'Save proposal'}).click();
    await page.waitForFunction(() => document.querySelector('#feedback-count')?.textContent === '5');
    await page.getByRole('tab', {name: 'Audio'}).click();
    await page.locator('.asset[data-asset="line-milo-okayest"]').click();
    await page.waitForFunction(() => !(document.querySelector('#world-audio') as HTMLAudioElement).hidden);
    const audition = await page.evaluate(async () => { const audio = document.querySelector('#world-audio') as HTMLAudioElement; await audio.play(); await new Promise(done => setTimeout(done, 400)); const time = audio.currentTime; audio.pause(); return time; });
    assert.ok(audition > 0.2, `Audio audition advanced ${audition}s`);
    report.push('World view: lineup, mug model sheet, audio audition and asset-targeted feedback all working');
    await page.getByRole('tab', {name: 'All'}).click();
    await page.getByRole('tab', {name: 'Scene'}).click();
    const restored = await page.evaluate(() => ({
      footer: document.querySelector('footer #source')?.textContent,
      targets: [...(document.querySelector('#target') as HTMLSelectElement).options].map(option => option.value),
      cueDisabled: (document.querySelector('#cue-start') as HTMLInputElement).disabled,
    }));
    assert.equal(restored.footer, 'episodes/night-shift/scenes/01-closing-time.ts');
    assert.ok(restored.targets.includes('milo') && !restored.targets.includes('mug'), 'Scene targets restored after World view');
    assert.equal(restored.cueDisabled, false, 'Timing fields re-enabled after World view');
    report.push('Returning from World view restores scene targets, fields and source path');
    await page.screenshot({path: '.zimba/verification/episode-studio.png'});

    // Feedback persisted as agent-readable files with the right shape
    const feedback = await readFeedback(root);
    const kinds = feedback.map(item => item.kind).sort();
    assert.deepEqual(kinds, ['appearance', 'settings', 'sketch', 'timing', 'transform']);
    const move = feedback.find(item => item.kind === 'transform')!;
    assert.equal(move.target, 'dot'); assert.equal(move.proposed?.x, 330); assert.equal(move.proposed?.expression, 'surprised');
    assert.equal(move.frame, Math.round(5.5 * 24));
    const timing = feedback.find(item => item.kind === 'timing')!;
    assert.equal(timing.target, 'cue-2'); assert.equal(typeof timing.proposed?.at, 'number');
    const sketch = feedback.find(item => item.kind === 'sketch')!;
    assert.ok(sketch.strokes![0].length >= 20, 'Sketch stores world-space stroke points');
    const settings = feedback.find(item => item.kind === 'settings')!;
    assert.equal(settings.proposed?.width, 1920);
    assert.ok(feedback.some(item => item.target === 'mug' && item.kind === 'appearance'));
    report.push(`Feedback files: ${kinds.join(', ')}`);

    // Agent side: CLI lists and resolves feedback
    assert.match(cli(root, 'feedback', '--status', 'pending'), /Dot should step closer/);
    cli(root, 'resolve', timing.id, '--status', 'applied', '--note', 'Moved Dot line; validated and previewed.');
    const resolved = (await readFeedback(root)).find(item => item.id === timing.id)!;
    assert.equal(resolved.status, 'applied'); assert.match(resolved.resolution!, /validated/);
    assert.equal(JSON.parse(cli(root, 'feedback', '--status', 'pending', '--json')).length, 4);
    report.push('CLI feedback list and resolve update the queue');

    // Live reload after a code edit
    const sceneFile = resolve(root, 'episodes/night-shift/scenes/03-unboxing.ts');
    await writeFile(sceneFile, (await readFile(sceneFile, 'utf8')).replace("title: 'Unboxing'", "title: 'The unboxing'"));
    await page.waitForFunction(() => [...document.querySelectorAll('.scene-chip')].some(chip => chip.textContent?.includes('The unboxing')), undefined, {timeout: 10000});
    await page.waitForFunction(() => document.querySelector('#feedback-list')?.textContent?.includes('older revision'));
    report.push('Live reload: scene edit appears in Studio; earlier feedback flagged as older revision');

    // Mobile layout
    await page.setViewportSize({width: 390, height: 844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow on mobile');
    assert.deepEqual(errors, []);

    // Full export
    const started = performance.now();
    const output = await renderVideo(root, await loadProduction(root, 'night-shift'), server.url);
    const seconds = (performance.now() - started) / 1000;
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], {encoding: 'utf8'}));
    const video = probe.streams.find((stream: any) => stream.codec_type === 'video');
    assert.equal(video.width, 1280); assert.equal(video.height, 720); assert.equal(video.r_frame_rate, '24/1');
    assert.ok(Math.abs(Number(probe.format.duration) - 30) < 0.1, `Duration ${probe.format.duration}`);
    const loudness = (start: number) => {
      const pcm = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(start), '-t', '0.5', '-i', output, '-f', 's16le', '-ac', '1', 'pipe:1']);
      let sum = 0; for (let index = 0; index + 1 < pcm.length; index += 2) sum += pcm.readInt16LE(index) ** 2;
      return Math.sqrt(sum / (pcm.length / 2));
    };
    const speech = loudness(3.0), finalLine = loudness(23 + 2.0);
    assert.ok(speech > 300 && finalLine > 300, `Dialogue audible in export (rms ${speech.toFixed(0)}, ${finalLine.toFixed(0)})`);
    await cp(output, '.zimba/verification/night-shift.mp4');
    report.push(`Export: 30.00s, 1280x720, 24fps, audio rms ${speech.toFixed(0)} / ${finalLine.toFixed(0)} during dialogue, rendered in ${seconds.toFixed(1)}s`);
    console.log(`\nREPORT\n- ${report.join('\n- ')}`);
  } finally {
    await browser.close(); await server.close(); await rm(root, {recursive: true, force: true});
  }
});
