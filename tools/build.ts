import {build} from 'esbuild';
import {mkdir, cp} from 'node:fs/promises';
await mkdir('dist', {recursive: true});
await build({entryPoints: ['src/cli.ts'], outfile: 'dist/cli.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', banner: {js: '#!/usr/bin/env node'}});
console.log('Built dist/cli.mjs');
if (process.argv.includes('--extension')) {
	for (const folder of ['src', 'dist', 'templates', 'docs']) {
		await cp(folder, `extension/runtime/${folder}`, {recursive: true, filter: path => !path.includes('.zimba')});
	}
	await mkdir('extension/runtime/tools', {recursive: true});
	await cp('tools/speech.ps1', 'extension/runtime/tools/speech.ps1');  await cp('tools/speech-winrt.ps1', 'extension/runtime/tools/speech-winrt.ps1');	console.log('Prepared standalone extension runtime');
}