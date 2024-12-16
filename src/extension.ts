import * as vscode from 'vscode';
import * as https from 'http';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.sendPrompt', async () => {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            const fileName = editor.document.fileName;
            const prompt = await getPromptFromPython(fileName);

            if (prompt) {
                editor.edit(editBuilder => {
                    const position = editor.selection.active;
                    editBuilder.insert(position, prompt);
                });
            }
        }
    });

    context.subscriptions.push(disposable);
}

async function getPromptFromPython(fileName: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/generate_prompt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response.prompt);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', error => reject(error));
        req.write(JSON.stringify({ file_name: fileName }));
        req.end();
    });
}

export function deactivate() {}
