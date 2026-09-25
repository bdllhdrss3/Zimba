import {build} from 'esbuild';
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const result = await build({
  stdin: {contents: `
    import Konva from 'konva';
    import {gsap} from 'gsap';
    const stage = new Konva.Stage({container: 'stage', width: 640, height: 360});
    const layer = new Konva.Layer(); stage.add(layer);
    layer.add(new Konva.Rect({width:640,height:360,fill:'#dceee8'}));
    const actor = new Konva.Circle({x:80,y:220,radius:40,fill:'#e75063'}); layer.add(actor);
    const state = {x:80};
    const timeline = gsap.timeline({paused:true}).to(state,{x:550,duration:10,ease:'none'});
    window.sample = time => {timeline.seek(time); actor.x(state.x); layer.draw(); return stage.toDataURL();};
  `, resolveDir: process.cwd()},
  bundle: true, write: false, platform: 'browser', format: 'iife',
});
const browser = await chromium.launch({channel: 'msedge', headless: true});
try {
  const page = await browser.newPage();
  await page.setContent('<div id="stage"></div>');
  await page.addScriptTag({content: result.outputFiles[0].text});
  const sample = (time: number) => page.evaluate(time => (window as any).sample(time), time);
  const first = await sample(0);
  const middle = await sample(5);
  const last = await sample(10);
  assert.notEqual(first, middle);
  assert.notEqual(middle, last);
  assert.equal(await sample(5), middle);
  assert.equal(await sample(0), first);
  await mkdir('.zimba/spike', {recursive: true});
  await writeFile('.zimba/spike/middle.png', Buffer.from(middle.split(',')[1], 'base64'));
  console.log('PASS: Konva + GSAP render nonidentical frames and deterministic backward/forward seeks in headless Edge.');
} finally {
  await browser.close();
}