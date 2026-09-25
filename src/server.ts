import {createServer, type ServerResponse} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {watch} from 'chokidar';
import {build} from 'esbuild';
import {frameworkRoot, listEpisodes, loadProduction, saveFeedback} from './project';
import type {Production} from './schema';

export async function serve(root: string, episode: string, port = 0, watching = true) {
  let production = await loadProduction(root, episode);
  let problem: string | undefined;
  let rendering = false;
  const token = randomBytes(24).toString('hex');
  const clients = new Set<ServerResponse>();
  const web = await build({entryPoints: [resolve(frameworkRoot, 'src/ui.ts')], bundle: true, write: false, platform: 'browser', format: 'iife', minify: true, logLevel: 'silent'});
  const script = web.outputFiles[0].text;
  const style = await readFile(resolve(frameworkRoot, 'src/ui.css'), 'utf8');
  const episodes = await listEpisodes(root);
  const broadcast = () => clients.forEach(client => client.write(`data: ${JSON.stringify({revision: production.revision, error: problem})}\n\n`));
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.searchParams.get('token') !== token) {response.writeHead(403).end('Forbidden'); return;}
    const reply = (data: unknown, status = 200) => {response.writeHead(status, {'Content-Type': 'application/json'}).end(JSON.stringify(data));};
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:; media-src data:; connect-src 'self'; font-src 'self';");
        response.writeHead(200, {'Content-Type': 'text/html'}).end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zimba Studio</title><link rel="stylesheet" href="/style.css?token=${token}"></head><body><div id="boot">Opening Zimba...</div><script src="/app.js?token=${token}"></script></body></html>`);
      } else if (request.method === 'GET' && url.pathname === '/app.js') {
        response.writeHead(200, {'Content-Type': 'text/javascript'}).end(script);
      } else if (request.method === 'GET' && url.pathname === '/style.css') {
        response.writeHead(200, {'Content-Type': 'text/css'}).end(style);
      } else if (request.method === 'GET' && url.pathname === '/data') {
        const selected = url.searchParams.get('episode') ?? episode;
        if (!episodes.includes(selected)) throw new Error('Unknown episode');
        if (selected !== episode) {production = await loadProduction(root, selected); episode = selected; problem = undefined;}
        reply({production, episodes, error: problem});
      } else if (request.method === 'GET' && url.pathname === '/events') {
        response.writeHead(200, {'Content-Type': 'text/event-stream', Connection: 'keep-alive'});
        response.write(': connected\n\n'); clients.add(response);
        request.on('close', () => clients.delete(response));
      } else if (request.method === 'POST' && ['/feedback', '/render'].includes(url.pathname)) {
        const expectedOrigin = `http://${request.headers.host}`;
        if (request.headers.origin && request.headers.origin !== expectedOrigin) throw new Error('Cross-origin requests are not allowed');
        if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('Expected JSON');
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of request) {size += chunk.length; if (size > 1024 * 1024) throw new Error('Request too large'); chunks.push(chunk);}
        const value = JSON.parse(Buffer.concat(chunks).toString());
        const current = await loadProduction(root, episode);
        if (url.pathname === '/feedback') {
          const feedback = await saveFeedback(root, value, current);
          production = {...current, feedback: [...current.feedback, feedback]}; reply(feedback); broadcast();
        } else {
          if (rendering) throw new Error('A render is already running');
          rendering = true;
          try {
            const {renderVideo} = await import('./render');
            const output = await renderVideo(root, current, address()); reply({output});
          } finally {rendering = false;}
        }
      } else {response.writeHead(404).end('Not found');}
    } catch (error) {reply({error: String(error)}, 400);}
  });
  await new Promise<void>((accept, reject) => {server.once('error', reject); server.listen(port, '127.0.0.1', accept);});
  const address = () => `http://127.0.0.1:${(server.address() as any).port}/?token=${token}`;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  const watcher = watching ? watch(root, {ignoreInitial: true, ignored: path => /(?:^|[\\/])(?:node_modules|renders|\.zimba|\.git)(?:[\\/]|$)/.test(path)}) : undefined;
  watcher?.on('all', () => {
    const version = ++generation;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const next = await loadProduction(root, episode);
        if (version !== generation) return;
        production = next; problem = undefined;
      } catch (error) {if (version !== generation) return; problem = String(error);}
      broadcast();
    }, 250);
  });
  return {url: address(), get production(): Production {return production;}, close: async () => {
    clearTimeout(timer); await watcher?.close(); clients.forEach(client => client.end());
    server.closeAllConnections(); await new Promise<void>(done => server.close(() => done()));
  }};
}