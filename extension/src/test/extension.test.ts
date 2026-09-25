import * as assert from 'assert';
import * as vscode from 'vscode';
import {resolve} from 'node:path';

suite('Zimba Studio', () => {
	test('opens a show project in a native webview panel', async () => {
		const extension = vscode.extensions.getExtension('zimba-local.zimba');
		assert.ok(extension, 'Extension is installed in the test host');
		await extension.activate();
		assert.ok((await vscode.commands.getCommands(true)).includes('zimba.open'));
		const project = vscode.Uri.file(resolve(__dirname, '../../../examples/small-hours/project.json'));
		await vscode.commands.executeCommand('zimba.open', project);
		for (let attempt = 0; attempt < 50; attempt++) {
			const tab = vscode.window.tabGroups.all.flatMap(group => group.tabs).find(tab => tab.label === 'Zimba: Small Hours');
			if (tab) { assert.ok(tab.input instanceof vscode.TabInputWebview); return; }
			await new Promise(done => setTimeout(done, 100));
		}
		assert.fail('Zimba Studio panel did not open');
	});
});
