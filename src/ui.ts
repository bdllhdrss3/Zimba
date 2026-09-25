import Konva from 'konva';
import {createIcons, icons} from 'lucide';
import {Player, thumbnail, modelSheet, lineup} from './player';
import type {Production, FeedbackInput, Asset, Scene} from './schema';

const token = new URLSearchParams(location.search).get('token')!;
const endpoint = (path: string) => `${path}${path.includes('?') ? '&' : '?'}token=${token}`;
async function request(path: string, data?: unknown) {
  const response = await fetch(endpoint(path), data === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Request failed');
  return result;
}
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const icon = (name: string) => `<i data-lucide="${name}"></i>`;
const decorate = () => createIcons({icons, attrs: {'stroke-width': 1.6}});
let production: Production;
let player: Player;
let activeScene: Scene;
let playing = false;
let selected: string | undefined;
let currentTime = 0;
let lastTick = 0;
let currentTool = 'select';
let proposed: Record<string, number | string> = {};
let strokes: number[][] = [];
let feedbackKind: FeedbackInput['kind'] = 'comment';
let updating = false;
let previewError = false;
let dirtyFeedback = false;
let draftRevision = '';
let refreshQueued = false;

function markDraft(kind: FeedbackInput['kind']) {
  if (!dirtyFeedback) draftRevision = production.revision;
  dirtyFeedback = true; feedbackKind = kind;
  get('draft-state').textContent = 'Unsaved proposal';
}
function status(message: string, error = false) {
  get('status').textContent = message; get('status').classList.toggle('error', error);
}
function asset(id: string): Asset {return production.assets.find(asset => asset.id === id)!;}

async function main() {
  const initial = await request('/data'); production = initial.production;
  if (new URLSearchParams(location.search).has('render')) {
    const host = document.createElement('div'); document.body.replaceChildren(host); document.body.className = 'render';
    player = new Player(host, production); await player.load(production.scenes[0]);
    await document.fonts.ready;
    const contact = async (sceneId: string, every: number, width: number) => {
      const scene = production.scenes.find(scene => scene.id === sceneId)!; await player.load(scene);
      const times: number[] = []; for (let time = 0; time < scene.duration - 1e-6; time += every) times.push(time);
      const height = Math.round(width * production.project.height / production.project.width), columns = Math.min(6, times.length);
      const canvas = document.createElement('canvas'); canvas.width = columns * width; canvas.height = Math.ceil(times.length / columns) * (height + 22) + 30;
      const context = canvas.getContext('2d')!; context.fillStyle = '#1d2022'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#eceef0'; context.font = '15px Verdana'; context.fillText(`${production.episode.id} / ${scene.id}: ${scene.title}`, 8, 20);
      for (const [index, time] of times.entries()) {
        player.seek(time); const image = new Image(); image.src = player.frame(); await image.decode();
        const x = (index % columns) * width, y = 30 + Math.floor(index / columns) * (height + 22);
        context.drawImage(image, x + 2, y, width - 4, height); context.fillStyle = '#a6afb5'; context.font = '12px Verdana'; context.fillText(`${time.toFixed(2)}s`, x + 4, y + height + 15);
      }
      return canvas.toDataURL('image/png');
    };
    (window as any).zimbaRender = {revision: production.revision, load: (id: string) => player.load(production.scenes.find(scene => scene.id === id)!), frame: (time: number) => {player.seek(time); return player.frame();},
      sheet: async (id: string) => (await modelSheet(asset(id))).url, lineup: async () => (await lineup(production)).url, contact};
    return;
  }
  document.body.innerHTML = `
    <header class="app-header"><div class="brand">${icon('clapperboard')}<strong>Zimba</strong><span class="divider"></span><span id="show-title"></span></div><div class="header-actions"><span id="status" role="status">Opening preview</span><button id="export" class="primary">${icon('download')}Export MP4</button></div></header>
    <div class="workspace">
      <aside class="library"><div class="pane-heading"><h2>Project</h2><span id="asset-count"></span></div>
        <label class="field">Episode<select id="episode"></select></label>
        <div class="pane-heading"><h2>Assets</h2><button id="clear-filter" class="icon-button" title="Show all assets" aria-label="Show all assets">${icon('layers')}</button></div>
        <label class="search">${icon('search')}<input id="search" placeholder="Search assets" aria-label="Search assets"></label>
        <div class="filter-tabs" role="tablist"><button data-filter="all" class="active" role="tab">All</button><button data-filter="character" role="tab">Cast</button><button data-filter="environment" role="tab">Sets</button><button data-filter="prop" role="tab">Props</button><button data-filter="audio" role="tab">Audio</button></div>
        <div id="assets" class="asset-grid"></div><div id="asset-detail" class="asset-detail"></div>
      </aside>
      <main class="studio"><div class="scene-toolbar"><div><div class="mode-toggle" role="tablist" aria-label="Preview mode"><button data-mode="scene" class="active" role="tab">${icon('film')}Scene</button><button data-mode="world" role="tab">${icon('globe')}World</button></div><strong id="scene-title"></strong></div><div class="toolbar"><button class="icon-button active" data-tool="select" title="Select / propose placement" aria-label="Select / propose placement">${icon('mouse-pointer-2')}</button><button class="icon-button" data-tool="pen" title="Sketch feedback" aria-label="Sketch feedback">${icon('pencil')}</button><button class="icon-button" id="clear-overlay" title="Clear proposal" aria-label="Clear proposal">${icon('eraser')}</button><span id="dimensions"></span></div></div>
        <div id="error-banner" role="alert" hidden></div><div id="canvas-area"><div id="canvas"></div><div id="world-view" hidden><img id="world-image" alt=""><div id="world-caption"></div><audio id="world-audio" controls hidden></audio></div></div>
        <div class="transport"><div class="transport-buttons"><button id="back" class="icon-button" title="Previous frame" aria-label="Previous frame">${icon('skip-back')}</button><button id="play" class="icon-button play" title="Play / pause" aria-label="Play / pause">${icon('play')}</button><button id="forward" class="icon-button" title="Next frame" aria-label="Next frame">${icon('skip-forward')}</button></div><output id="timecode">00:00:00</output><input id="scrub" type="range" min="0" value="0" step="1" aria-label="Scrub scene"><span id="duration"></span><button id="mute" class="icon-button" title="Toggle audio" aria-label="Toggle audio">${icon('volume-2')}</button></div>
        <section class="timeline"><div class="pane-heading"><h2>Timeline</h2><span id="fps"></span></div><div id="scene-strip"></div><div id="tracks"></div></section>
      </main>
      <aside class="inspector"><div class="pane-heading"><h2>Review</h2><span id="draft-state">No proposal</span></div>
        <label class="field">Target<select id="target"><option value="">Scene</option></select></label>
        <div class="section-label">Transform proposal</div><div class="numeric-grid"><label>X<input id="pos-x" type="number" step="1"></label><label>Y<input id="pos-y" type="number" step="1"></label><label>Scale X<input id="scale-x" type="number" step="0.05"></label><label>Scale Y<input id="scale-y" type="number" step="0.05"></label><label>Rotation<input id="rotation" type="number" step="1"></label><label>Layer<input id="layer" type="number" step="1" min="0"></label></div>
        <div class="appearance"><label class="field">Expression<select id="expression"></select></label><label class="field">Pose<select id="pose"></select></label></div>
        <div class="numeric-grid"><label>Start (s)<input id="cue-start" type="number" min="0" step="0.125"></label><label>Duration (s)<input id="cue-duration" type="number" min="0" step="0.125"></label></div>
        <label class="field">Feedback<textarea id="comment" rows="4" placeholder="What should change?"></textarea></label><button id="save" class="primary wide">${icon('message-square-plus')}Save proposal</button>
        <details id="settings"><summary>Production settings</summary><div class="numeric-grid"><label>Width<input id="width" type="number" min="160"></label><label>Height<input id="height" type="number" min="160"></label><label>Output FPS<input id="output-fps" type="number" min="1" max="60"></label><label>Pose FPS<input id="pose-fps" type="number" min="1" max="24"></label></div><button id="propose-settings">${icon('sliders-horizontal')}Propose settings</button></details>
        <div class="pane-heading"><h2>Feedback</h2><span id="feedback-count"></span></div><div id="feedback-list"></div>
      </aside>
    </div><footer><span id="source"></span><span id="revision"></span></footer>`;
  get('show-title').textContent = production.project.title;
  const episodeSelect = get<HTMLSelectElement>('episode');
  for (const episode of initial.episodes) episodeSelect.add(new Option(episode, episode));
  episodeSelect.value = production.episode.id;
  episodeSelect.onchange = async () => {
    if (dirtyFeedback && !confirm('Discard the unsaved proposal?')) {episodeSelect.value = production.episode.id; return;}
    resetDraft(); await refresh(episodeSelect.value);
  };
  const drawAssets = async (filter = 'all') => {
    const search = get<HTMLInputElement>('search').value.toLowerCase();
    const host = get('assets'); host.replaceChildren();
    for (const item of production.assets.filter(item => (filter === 'all' || item.type === filter) && `${item.name} ${item.tags.join(' ')} ${item.description}`.toLowerCase().includes(search))) {
      const button = document.createElement('button'); button.className = 'asset'; button.dataset.asset = item.id;
      const image = document.createElement('img'); image.alt = item.name;
      image.src = await thumbnail(item);
      const label = document.createElement('span'); label.textContent = item.name;
      const type = document.createElement('small'); type.textContent = item.type;
      button.append(image, label, type); host.append(button);
      button.onclick = () => {
        const detail = get('asset-detail'); detail.replaceChildren();
        const title = document.createElement('strong'); title.textContent = item.name;
        const description = document.createElement('p'); description.textContent = item.description;
        const path = document.createElement('code'); path.textContent = item.source;
        detail.append(title, description, path);
        if (mode === 'world') {void showWorld(item.id); return;}
        const instance = activeScene.actors.find(actor => actor.asset === item.id);
        if (instance) select(instance.id);
      };
    }
    if (!host.children.length) host.textContent = 'No matching assets';
    get('asset-count').textContent = `${production.assets.length} assets`;
  };
  get<HTMLInputElement>('search').oninput = () => {void drawAssets();};
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.onclick = () => {
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button)); void drawAssets(button.dataset.filter);
  });
  get('clear-filter').onclick = () => {get<HTMLInputElement>('search').value = ''; void drawAssets();};
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode as 'scene' | 'world'));
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(button => button.onclick = () => {
    currentTool = button.dataset.tool!; playing = false; player.pauseAudio();
    document.querySelectorAll('[data-tool]').forEach(item => item.classList.toggle('active', item === button));
    if (currentTool === 'pen') {player.overlay.destroyChildren(); selected = undefined;}
  });
  get('clear-overlay').onclick = () => {resetDraft(); player.overlay.destroyChildren(); player.overlay.draw();};
  get('play').onclick = () => {playing = !playing; if (currentTime >= activeScene.duration - 1 / production.project.fps) currentTime = 0; if (!playing) player.pauseAudio(); get('play').innerHTML = icon(playing ? 'pause' : 'play'); decorate();};
  get('back').onclick = () => seek(currentTime - 1 / production.project.fps);
  get('forward').onclick = () => seek(currentTime + 1 / production.project.fps);
  get<HTMLInputElement>('scrub').oninput = event => seek(Number((event.target as HTMLInputElement).value) / production.project.fps);
  let muted = false;
  get('mute').onclick = () => {muted = !muted; player.audio.forEach(({element}) => element.muted = muted); get('mute').innerHTML = icon(muted ? 'volume-x' : 'volume-2'); decorate();};
  get<HTMLSelectElement>('target').onchange = event => select((event.target as HTMLSelectElement).value || undefined);
  const transforms: Record<string, string> = {'pos-x': 'x', 'pos-y': 'y', 'scale-x': 'scaleX', 'scale-y': 'scaleY', rotation: 'rotation', layer: 'layer'};
  for (const [field, key] of Object.entries(transforms)) get<HTMLInputElement>(field).onchange = () => {markDraft('transform'); proposed[key] = Number(get<HTMLInputElement>(field).value); showGhost();};
  for (const key of ['expression', 'pose']) get<HTMLSelectElement>(key).onchange = () => {markDraft('appearance'); proposed[key] = get<HTMLSelectElement>(key).value;};
  for (const [field, key] of [['cue-start', 'at'], ['cue-duration', 'duration']]) get<HTMLInputElement>(field).onchange = () => {markDraft('timing'); proposed[key] = Number(get<HTMLInputElement>(field).value);};
  get<HTMLTextAreaElement>('comment').oninput = () => markDraft(feedbackKind);
  get('save').onclick = async () => {
    if (previewError) {status('Fix source errors before submitting', true); return;}
    const button = get<HTMLButtonElement>('save'); button.disabled = true;
    try {
      const text = get<HTMLTextAreaElement>('comment').value.trim();
      if (mode === 'world' && !text) throw new Error('Describe the world change you want');
      const keys = Object.keys(proposed);
      const derived: FeedbackInput['kind'] = strokes.length ? 'sketch' : feedbackKind === 'settings' ? 'settings' : keys.some(key => key === 'at' || key === 'duration') ? 'timing' : keys.some(key => ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'layer'].includes(key)) ? 'transform' : keys.length ? 'appearance' : 'comment';
      const kind = mode === 'world' ? (worldAsset ? 'appearance' : 'comment') : derived;
      const result = await request('/feedback', {episode: production.episode.id, scene: activeScene.id, revision: draftRevision || production.revision, frame: mode === 'world' ? 0 : Math.min(Math.round(currentTime * production.project.fps), Math.round(activeScene.duration * production.project.fps) - 1), target: mode === 'world' ? worldAsset : selected, kind, text: text || `Proposed ${feedbackKind} change`, ...(mode === 'scene' && Object.keys(proposed).length ? {proposed} : {}), ...(mode === 'scene' && strokes.length ? {strokes} : {})});
      production.feedback.push(result); resetDraft(); feedbackList(); status('Proposal saved for your agent');
      if (refreshQueued) {refreshQueued = false; await refresh();}
    } catch (error) {status(String(error), true);} finally {button.disabled = false;}
  };
  get('propose-settings').onclick = () => {
    markDraft('settings'); selected = undefined;
    proposed = {width: Number(get<HTMLInputElement>('width').value), height: Number(get<HTMLInputElement>('height').value), fps: Number(get<HTMLInputElement>('output-fps').value), poseFps: Number(get<HTMLInputElement>('pose-fps').value)};
    get<HTMLTextAreaElement>('comment').value = 'Update production settings and check scene framing.';
  };
  get('export').onclick = async () => {
    const button = get<HTMLButtonElement>('export'); button.disabled = true; status('Rendering episode...');
    try {const result = await request('/render', {}); status(`Exported ${result.output}`);} catch (error) {status(String(error), true);} finally {button.disabled = false;}
  };
  await drawAssets(); await loadScene(production.scenes[0]); updateProject();
  const events = new EventSource(endpoint('/events'));
  events.onmessage = async event => {
    const state = JSON.parse(event.data);
    if (state.error) {previewError = true; get('error-banner').hidden = false; get('error-banner').textContent = `Last valid preview retained. ${state.error}`; status('Source error', true); return;}
    if (dirtyFeedback) {refreshQueued = true; if (state.revision !== production.revision) status('Source changed; resolve your draft before refreshing', true); return;}
    await refresh(); await drawAssets();
  };
  events.onerror = () => status('Preview disconnected; reconnecting...', true);
  new ResizeObserver(() => fit()).observe(get('canvas-area'));
  const tick = (stamp: number) => {
    if (playing && !updating) {
      currentTime = Math.min(activeScene.duration, currentTime + Math.min((stamp - lastTick) / 1000, 0.1));
      player.seek(currentTime, !muted); updateTime();
      if (currentTime >= activeScene.duration) {playing = false; player.pauseAudio(); get('play').innerHTML = icon('play'); decorate();}
    }
    lastTick = stamp; requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick); decorate(); status('Preview ready');
  (window as any).zimbaTest = {get player() {return player;}, get production() {return production;}, seek, select, setMode, showWorld, get time() {return currentTime;}, get playing() {return playing;}};
}

let mode: 'scene' | 'world' = 'scene';
let worldAsset: string | undefined;
function setMode(next: 'scene' | 'world') {
  if (dirtyFeedback && next !== mode && !confirm('Discard the unsaved proposal?')) return;
  resetDraft(); mode = next; playing = false; player.pauseAudio();
  document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('active', (item as HTMLElement).dataset.mode === mode));
  get('canvas').hidden = mode === 'world'; get('world-view').hidden = mode === 'scene';
  document.querySelector('.transport')!.classList.toggle('disabled', mode === 'world');
  document.querySelectorAll<HTMLElement>('[data-tool], #clear-overlay').forEach(item => (item as HTMLButtonElement).disabled = mode === 'world');
  if (mode === 'world') void showWorld(worldAsset);
  else {get('scene-title').textContent = activeScene.title; sceneTargets(); select(undefined);}
}
async function showWorld(id?: string) {
  worldAsset = id && production.assets.some(item => item.id === id) ? id : undefined;
  const image = get<HTMLImageElement>('world-image'), audio = get<HTMLAudioElement>('world-audio');
  audio.pause(); audio.hidden = true; image.hidden = false;
  const target = get<HTMLSelectElement>('target'); target.replaceChildren(new Option('Whole world', ''));
  production.assets.forEach(item => target.add(new Option(`${item.name} (${item.id})`, item.id)));
  target.value = worldAsset ?? ''; selected = worldAsset;
  for (const field of ['pos-x', 'pos-y', 'scale-x', 'scale-y', 'rotation', 'layer', 'cue-start', 'cue-duration']) {const input = get<HTMLInputElement>(field); input.disabled = true; input.value = '';}
  for (const field of ['expression', 'pose']) {const input = get<HTMLSelectElement>(field); input.disabled = true; input.replaceChildren();}
  const item = worldAsset ? asset(worldAsset) : undefined;
  if (!item) {
    const sheet = await lineup(production); image.src = sheet.url; image.alt = 'Cast and props lined up in the main set at scene scale';
    get('scene-title').textContent = 'World: cast lineup';
    get('world-caption').textContent = 'Every character and prop at true scale on the first set. Click an asset for its model sheet.';
  } else if (item.type === 'audio') {
    image.hidden = true; audio.hidden = false; audio.src = item.media!;
    get('scene-title').textContent = `Audio: ${item.name}`;
    get('world-caption').textContent = `${item.duration?.toFixed(2)}s  ${item.text ? `"${item.text}"` : item.description}  ${item.provenance}`;
  } else {
    const sheet = await modelSheet(item); image.src = sheet.url; image.alt = `Model sheet for ${item.name}`;
    get('scene-title').textContent = `Model sheet: ${item.name}`;
    get('world-caption').textContent = `${item.expressions.length} expressions, ${item.poses.length} poses, ${Object.keys(item.anchors).length} anchors. ${item.source}`;
  }
  get<HTMLTextAreaElement>('comment').placeholder = item ? `Feedback about ${item.name}` : 'Feedback about the world';
}

function resetDraft() {
  dirtyFeedback = false; draftRevision = ''; strokes = []; proposed = {}; feedbackKind = 'comment';
  get('draft-state').textContent = 'No proposal'; get<HTMLTextAreaElement>('comment').value = '';
  if (player) {player.overlay.destroyChildren(); player.overlay.draw();}
}
function seek(time: number) {
  playing = false; player.pauseAudio(); currentTime = Math.max(0, Math.min(activeScene.duration - 1 / production.project.fps, time));
  player.seek(currentTime); player.overlay.destroyChildren(); player.overlay.draw(); updateTime();
  get('play').innerHTML = icon('play'); decorate();
}
function updateTime() {
  const frame = Math.floor(currentTime * production.project.fps);
  get('timecode').textContent = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(Math.floor(currentTime) % 60).padStart(2, '0')}:${String(frame % production.project.fps).padStart(2, '0')}`;
  get<HTMLInputElement>('scrub').value = String(frame);
}
function fit() {
  if (!player) return;
  const area = get('canvas-area');
  player.resize(Math.max(0.1, Math.min((area.clientWidth - 32) / production.project.width, (area.clientHeight - 32) / production.project.height)));
}
async function loadScene(scene: Scene) {
  updating = true; playing = false;
  const host = document.createElement('div'); host.id = 'canvas';
  const next = new Player(host, production);
  try {await next.load(scene);} catch (error) {next.destroy(); updating = false; throw error;}
  player?.destroy(); get('canvas').replaceWith(host); player = next; activeScene = scene; selected = undefined; currentTime = 0;
  host.hidden = mode === 'world';
  get('scene-title').textContent = mode === 'world' ? get('scene-title').textContent : scene.title;
  get('source').textContent = `episodes/${production.episode.id}/${production.episode.scenes[production.scenes.findIndex(item => item.id === scene.id)]}`;
  get('duration').textContent = `${scene.duration.toFixed(1)}s`;
  get<HTMLInputElement>('scrub').max = String(Math.round(scene.duration * production.project.fps) - 1);
  sceneTargets();
  bindCanvas(); timeline(); fit(); updateTime(); updating = false;
  if (mode === 'world') await showWorld(worldAsset);
}
function sceneTargets() {
  const target = get<HTMLSelectElement>('target'); target.replaceChildren(new Option('Scene', ''));
  activeScene.actors.forEach(actor => target.add(new Option(`${asset(actor.asset).name} (${actor.id})`, actor.id)));
  target.add(new Option('Camera', 'camera'));
  activeScene.actions.forEach(action => target.add(new Option(action.id, action.id)));
  activeScene.audio.forEach(cue => target.add(new Option(cue.id, cue.id)));
  get<HTMLTextAreaElement>('comment').placeholder = 'What should change?';
}
function bindCanvas() {
  let drawing: Konva.Line | undefined;
  let sketchGroup: Konva.Group | undefined;
  player.stage.on('mousedown touchstart', event => {
    const pointer = player.stage.getPointerPosition(); if (!pointer) return;
    if (currentTool === 'pen') {
      markDraft('sketch'); playing = false; player.pauseAudio();
      const point = player.world.getAbsoluteTransform().copy().invert().point(pointer);
      if (!sketchGroup) {sketchGroup = new Konva.Group({...player.camera}); player.overlay.add(sketchGroup);}
      const points = [point.x, point.y]; strokes.push(points);
      drawing = new Konva.Line({points, stroke: '#edac36', strokeWidth: 4, lineCap: 'round', lineJoin: 'round', listening: false});
      sketchGroup.add(drawing); player.overlay.draw(); return;
    }
    if (event.target.getLayer() === player.overlay) return;
    for (const actor of [...activeScene.actors].reverse()) {
      const rect = player.actors.get(actor.id)!.getClientRect();
      if (pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {select(actor.id); return;}
    }
  });
  player.stage.on('mousemove touchmove', () => {
    if (!drawing) return;
    const pointer = player.stage.getPointerPosition(); if (!pointer) return;
    const point = player.world.getAbsoluteTransform().copy().invert().point(pointer);
    const points = strokes[strokes.length - 1]; if (points.length >= 8000) return;
    points.push(point.x, point.y); drawing.points(points); player.overlay.draw();
  });
  player.stage.on('mouseup touchend', () => {drawing = undefined;});
}
function select(id?: string) {
  if (mode === 'world') return;
  if (dirtyFeedback && id !== selected && !confirm('Discard this draft and select another target?')) return;
  if (id !== selected) resetDraft();
  selected = id; playing = false; player.pauseAudio(); get<HTMLSelectElement>('target').value = id ?? '';
  const actor = activeScene.actors.find(actor => actor.id === id);
  const state = actor ? player.states.get(actor.id)! : player.camera;
  for (const [field, key] of Object.entries({'pos-x': 'x', 'pos-y': 'y', 'scale-x': 'scaleX', 'scale-y': 'scaleY', rotation: 'rotation'})) {
    get<HTMLInputElement>(field).value = String(Math.round(Number((state as any)[key]) * 100) / 100);
    get<HTMLInputElement>(field).disabled = !actor && id !== 'camera';
  }
  get<HTMLInputElement>('layer').value = String(actor ? activeScene.actors.indexOf(actor) : 0);
  for (const field of ['layer', 'cue-start', 'cue-duration']) get<HTMLInputElement>(field).disabled = false;
  for (const key of ['expression', 'pose'] as const) {
    const select = get<HTMLSelectElement>(key); select.replaceChildren(); select.disabled = !actor;
    if (actor) for (const name of asset(actor.asset)[key === 'expression' ? 'expressions' : 'poses']) select.add(new Option(name, name));
  }
  const cue = activeScene.actions.find(action => action.id === id) ?? activeScene.audio.find(cue => cue.id === id);
  get<HTMLInputElement>('cue-start').value = String(cue?.at ?? currentTime);
  get<HTMLInputElement>('cue-duration').value = String(cue?.duration ?? 0);
  showGhost();
}
function showGhost() {
  player.overlay.destroyChildren();
  const actor = selected && player.actors.get(selected); if (!actor) {player.overlay.draw(); return;}
  const group = new Konva.Group({...player.camera}); player.overlay.add(group);
  const ghost = actor.clone({...proposed, opacity: 0.65, draggable: true}) as Konva.Group;
  ghost.find('Shape').forEach(node => node.listening(true)); group.add(ghost);
  const transformer = new Konva.Transformer({nodes: [ghost], borderStroke: '#edac36', anchorStroke: '#edac36', anchorFill: '#fff8e3', anchorSize: 8, rotateEnabled: true, flipEnabled: false}); group.add(transformer);
  ghost.on('dragend transformend', () => {
    markDraft('transform'); proposed = {x: ghost.x(), y: ghost.y(), scaleX: ghost.scaleX(), scaleY: ghost.scaleY(), rotation: ghost.rotation()};
    for (const [field, key] of Object.entries({'pos-x': 'x', 'pos-y': 'y', 'scale-x': 'scaleX', 'scale-y': 'scaleY', rotation: 'rotation'})) get<HTMLInputElement>(field).value = Number(proposed[key]).toFixed(2);
  });
  player.overlay.draw();
}
function timeline() {
  const strip = get('scene-strip'); strip.replaceChildren();
  for (const [index, scene] of production.scenes.entries()) {
    const button = document.createElement('button'); button.className = `scene-chip ${scene.id === activeScene.id ? 'active' : ''}`;
    button.textContent = `${String(index + 1).padStart(2, '0')}  ${scene.title}  /  ${scene.duration}s`;
    button.onclick = async () => {if (dirtyFeedback && !confirm('Discard the unsaved proposal?')) return; resetDraft(); await loadScene(production.scenes.find(item => item.id === scene.id) ?? production.scenes[0]);};
    strip.append(button);
  }
  const host = get('tracks'); host.replaceChildren();
  const rows = [{name: 'Camera', id: 'camera'}, ...activeScene.actors.map(actor => ({name: asset(actor.asset).name, id: actor.id})), {name: 'Audio', id: 'audio'}];
  for (const row of rows) {
    const track = document.createElement('div'); track.className = 'track';
    const label = document.createElement('span'); label.textContent = row.name;
    const lane = document.createElement('div'); lane.className = 'lane';
    const cues = row.id === 'audio' ? activeScene.audio.map(cue => ({...cue, kind: 'audio'})) : activeScene.actions.filter(action => action.target === row.id);
    for (const cue of cues) {
      const button = document.createElement('button'); button.className = `cue ${cue.kind}`;
      button.style.left = `${cue.at / activeScene.duration * 100}%`; button.style.width = `${Math.max(3, cue.duration / activeScene.duration * 100)}%`;
      button.title = `${cue.id}: ${cue.kind}, ${cue.at}s, ${cue.duration}s`; button.textContent = cue.kind; button.setAttribute('aria-label', button.title);
      button.onclick = () => {seek(cue.at); select(cue.id);};
      button.draggable = true;
      button.ondragstart = event => {event.dataTransfer!.setData('text/plain', cue.id);};
      lane.append(button);
    }
    lane.ondragover = event => event.preventDefault();
    lane.ondrop = event => {
      event.preventDefault(); const id = event.dataTransfer!.getData('text/plain');
      const cue = [...activeScene.actions, ...activeScene.audio].find(cue => cue.id === id); if (!cue) return;
      select(id); markDraft('timing'); const bounds = lane.getBoundingClientRect();
      proposed.at = Math.round(Math.max(0, Math.min(activeScene.duration, (event.clientX - bounds.left) / bounds.width * activeScene.duration)) * production.project.fps) / production.project.fps;
      get<HTMLInputElement>('cue-start').value = String(proposed.at);
      get<HTMLTextAreaElement>('comment').value = `Move ${id} to ${Number(proposed.at).toFixed(2)} seconds.`;
    };
    track.append(label, lane); host.append(track);
  }
}
function feedbackList() {
  const host = get('feedback-list'); host.replaceChildren();
  const items = production.feedback.filter(item => item.episode === production.episode.id);
  get('feedback-count').textContent = String(items.length);
  for (const item of [...items].reverse()) {
    const entry = document.createElement('article'); entry.className = 'feedback-item';
    const title = document.createElement('strong'); title.textContent = `${item.scene} / ${item.target ?? 'scene'} / frame ${item.frame}`;
    const text = document.createElement('p'); text.textContent = item.text;
    const state = document.createElement('small'); state.textContent = `${item.status}${item.revision !== production.revision ? ' / older revision' : ''}`;
    entry.append(title, text, state); host.append(entry);
  }
  if (!items.length) {const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'No feedback yet'; host.append(empty);}
}
function updateProject() {
  get('show-title').textContent = production.project.title;
  get('dimensions').textContent = `${production.project.width} x ${production.project.height}`;
  get('fps').textContent = `${production.project.fps} fps / poses ${production.project.poseFps} fps`;
  get('revision').textContent = production.revision.slice(0, 10);
  for (const [field, key] of Object.entries({width: 'width', height: 'height', 'output-fps': 'fps', 'pose-fps': 'poseFps'})) get<HTMLInputElement>(field).value = String((production.project as any)[key]);
  feedbackList();
}
async function refresh(episode?: string) {
  if (updating) return;
  try {
    const next = await request(`/data${episode ? `?episode=${encodeURIComponent(episode)}` : ''}`);
    if (next.error) throw new Error(next.error);
    const old = production; production = next.production;
    try {if (old.revision !== production.revision || episode) await loadScene(production.scenes.find(scene => scene.id === activeScene.id) ?? production.scenes[0]);}
    catch (error) {production = old; throw error;}
    previewError = false; get('error-banner').hidden = true; updateProject(); status('Preview ready');
  } catch (error) {previewError = true; status(String(error), true); get('error-banner').hidden = false; get('error-banner').textContent = `Last valid preview retained. ${String(error)}`;}
}
main().catch(error => {document.body.textContent = `Unable to open Zimba: ${String(error)}`;});