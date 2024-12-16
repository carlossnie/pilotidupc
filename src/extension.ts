import * as vscode from 'vscode';
import { IncomingMessage, RequestOptions, ClientRequest } from 'http';
import * as http from 'http';

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

    let disposableFibonacci = vscode.commands.registerCommand('pilotidupc.createFibonacci', async () => {
        try {
            // Crear nuevo archivo Python
            const wsEdit = new vscode.WorkspaceEdit();
            const filePath = vscode.Uri.file(`${vscode.workspace.rootPath}/fibonacci.py`);
            wsEdit.createFile(filePath, { overwrite: true });
            await vscode.workspace.applyEdit(wsEdit);

            // Obtener el código del servidor
            const code = await getFibonacciCode();
            
            // Abrir y modificar el archivo
            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);
            
            await editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), code);
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });

    context.subscriptions.push(disposableFibonacci);
}

async function getPromptFromPython(fileName: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const options: RequestOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/generate_prompt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req: ClientRequest = http.request(options, (res: IncomingMessage) => {
            let data = '';

            res.on('data', (chunk: Buffer) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response: { prompt: string } = JSON.parse(data);
                    resolve(response.prompt);
                } catch (error: unknown) {
                    reject(error);
                }
            });
        });

        req.on('error', (error: Error) => reject(error));
        req.write(JSON.stringify({ file_name: fileName }));
        req.end();
    });
}

async function getFibonacciCode(): Promise<string> {
    // Primero verificar si el servidor está funcionando
    try {
        await checkServerHealth();
    } catch (error) {
        throw new Error(`Server not available: ${error}`);
    }

    return new Promise((resolve, reject) => {
        const options: RequestOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/generate_fibonacci',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req: ClientRequest = http.request(options, (res: IncomingMessage) => {
            let data = '';

            res.on('data', (chunk: Buffer) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    if (res.statusCode === 500) {
                        const error = JSON.parse(data);
                        reject(new Error(error.error || 'Internal Server Error'));
                        return;
                    }

                    if (res.statusCode !== 200) {
                        reject(new Error(`Server responded with status code ${res.statusCode}`));
                        return;
                    }

                    const response = JSON.parse(data);
                    if (!response.code) {
                        reject(new Error('No code received from server'));
                        return;
                    }

                    resolve(response.code);
                } catch (error) {
                    reject(new Error(`Failed to parse server response: ${error}`));
                }
            });
        });

        req.on('error', (error: Error) => {
            reject(new Error(`Network error: ${error.message}`));
        });

        req.end();
    });
}

async function checkServerHealth(): Promise<void> {
    return new Promise((resolve, reject) => {
        const options: RequestOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/health',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res: IncomingMessage) => {
            let data = '';

            res.on('data', (chunk: Buffer) => {
                data += chunk;
            });

            res.on('end', () => {
                const contentType = res.headers['content-type'] || '';
                
                if (!contentType.includes('application/json')) {
                    reject(new Error(`Tipo de contenido incorrecto: ${contentType}`));
                    return;
                }

                try {
                    const response = JSON.parse(data);
                    if (response.status === 'healthy' && response.server_status === 'running') {
                        resolve();
                    } else {
                        reject(new Error(`Estado del servidor no saludable: ${JSON.stringify(response)}`));
                    }
                } catch (error) {
                    reject(new Error(`Error al procesar respuesta del servidor: ${error}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Error de conexión: ${error.message}`));
        });

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout al contactar el servidor'));
        });

        req.end();
    });
}

export function deactivate() {}
