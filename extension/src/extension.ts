import * as vscode from 'vscode';
import {spawn, type ChildProcess} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {existsSync} from 'node:fs';

const processes = new Set<ChildProcess>();
export function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('Zimba');
	context.subscriptions.push(output);
	const open = async (file?: vscode.Uri, existingPanel?: vscode.WebviewPanel) => {
		if (!vscode.workspace.isTrusted) {
			void vscode.window.showWarningMessage('Trust this workspace before running its cartoon code.');
			return;
		}
		if (!file) {
			const candidates = await vscode.workspace.findFiles('**/project.json', '**/{node_modules,templates,.zimba,extension}/**');
			if (candidates.length === 1) { file = candidates[0]; }
			else if (candidates.length > 1) {
				const selected = await vscode.window.showQuickPick(candidates.map(uri => ({label: vscode.workspace.asRelativePath(uri), uri})), {title: 'Open a Zimba show'});
				file = selected?.uri;
			} else {
				file = (await vscode.window.showOpenDialog({title: 'Select the show project.json', filters: {'Zimba show': ['json']}, canSelectMany: false}))?.[0];
			}
		}
		if (!file) { return; }
		const config = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(file)).toString());
		if (config.schemaVersion !== 1 || !config.id || !config.width || !config.height) { throw new Error('Select a Zimba project.json file.'); }
		const panel = existingPanel ?? vscode.window.createWebviewPanel('zimba.studio', `Zimba: ${config.title}`, vscode.ViewColumn.Active, {enableScripts: true, retainContextWhenHidden: true, localResourceRoots: []});
		panel.webview.options = {enableScripts: true, localResourceRoots: []};
		panel.webview.html = '<!doctype html><html><body style="font:13px sans-serif;padding:24px">Starting Zimba preview...</body></html>';
		const packaged = resolve(context.extensionPath, 'runtime/dist/cli.mjs');
		const cli = existsSync(packaged) ? packaged : resolve(context.extensionPath, '../dist/cli.mjs');
		if (!existsSync(cli)) { throw new Error('Build Zimba first: npm run build in the framework directory.'); }
		const child = spawn('node', [cli, 'preview', '--show', dirname(file.fsPath)], {cwd: dirname(file.fsPath), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
		processes.add(child);
		let buffer = '';
		child.stdout?.on('data', data => {
			buffer += String(data);
			const match = buffer.match(/ZIMBA_URL=(http:\/\/127\.0\.0\.1:\d+\/\?token=[a-f0-9]+)/);
			if (!match) { return; }
			const url = match[1];
			const origin = new URL(url).origin;
			panel.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline';"><style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:0;overflow:hidden}</style></head><body><iframe title="Zimba cartoon review workspace" src="${url}" allow="autoplay; clipboard-write"></iframe></body></html>`;
			buffer = '';
		});
		child.stderr?.on('data', data => output.append(String(data)));
		child.on('error', error => { output.appendLine(String(error)); void vscode.window.showErrorMessage(`Zimba: ${error.message}`); });
		child.on('exit', code => { processes.delete(child); if (code && code !== 0) { output.show(true); } });
		panel.onDidDispose(() => {child.kill(); processes.delete(child);});
	};
	context.subscriptions.push(vscode.commands.registerCommand('zimba.open', (uri?: vscode.Uri) => open(uri).catch(error => vscode.window.showErrorMessage(String(error)))));
	context.subscriptions.push(vscode.window.registerCustomEditorProvider('zimba.project', {
		resolveCustomTextEditor: (document, panel) => open(document.uri, panel),
	}, {webviewOptions: {retainContextWhenHidden: true}, supportsMultipleEditorsPerDocument: false}));
}
export function deactivate() { for (const child of processes) { child.kill(); } processes.clear(); }
