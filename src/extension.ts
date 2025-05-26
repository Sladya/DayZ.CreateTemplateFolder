import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.DayZ.CreateTemplateFolder', async (uri: vscode.Uri) => {
        try {
            let rootPath: string;
            if (uri && uri.fsPath) {
                rootPath = uri.fsPath;
            } else {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    vscode.window.showErrorMessage('Откройте рабочую папку в VS Code');
                    return;
                }
                rootPath = workspaceFolders[0].uri.fsPath;
            }

            const folderName = await vscode.window.showInputBox({
                prompt: 'Введите имя новой папки (будет создана внутри выбранной)',
                validateInput: text => text.trim() === '' ? 'Имя не может быть пустым' : null
            });
            if (!folderName) {
                vscode.window.showWarningMessage('Отменено создание папки');
                return;
            }

            // Читаем настройки
            const config = vscode.workspace.getConfiguration('DayZ.CreateTemplateFolder');
            const authorName = config.get<string>('author') || 'Sladya';
            const folders = config.get<string[]>('folders') || ['scripts'];
            const subfolders = config.get<Record<string, string[]>>('subfolders') || {
                scripts: ['4_World', '3_Game', '5_Mission']
            };

            const newFolderPath = path.join(rootPath, folderName);

            try {
                await fs.access(newFolderPath);
                vscode.window.showErrorMessage(`Папка "${folderName}" уже существует`);
                return;
            } catch {
                // Папка не существует — идём дальше
            }

            await fs.mkdir(newFolderPath, { recursive: true });

            // Сначала создаём основные папки
            for (const mainFolder of folders) {
                const mainFolderPath = path.join(newFolderPath, mainFolder);
                await fs.mkdir(mainFolderPath, { recursive: true });
            }

            // Потом создаём вложенные папки внутри основных
            for (const mainFolder of folders) {
                const subs = subfolders[mainFolder] || [];
                for (const sub of subs) {
                    const subFolderPath = path.join(newFolderPath, mainFolder, sub);
                    await fs.mkdir(subFolderPath, { recursive: true });
                }
            }

            // Создаём config.cpp внутри scripts (если папка scripts есть)
            const configFolderPath = path.join(newFolderPath, 'scripts');
            const configContent =
`class CfgPatches
{
    class ${folderName}
    {
        units[]={};
        weapons[]={};
        requiredVersion=0.1;
        requiredAddons[]=
        {
            "DZ_Data",
            "DZ_Scripts"
        };
    };
};
class CfgMods
{
    class ${folderName}
    {
        dir = "${folderName}";
        name = "${folderName}";
        author = "${authorName}";
        version = "1";
        type = "mod";
        dependencies[] =
        {
            "Game",
            "World",
            "Mission"
        };
        class defs
        {
            class gameScriptModule
            {
                value = "";
                files[] = 
                {
                    "${folderName}/scripts/3_Game"
                };
            };
            class worldScriptModule
            {
                value = "";
                files[] = 
                {
                    "${folderName}/scripts/4_World"
                };
            };
            class missionScriptModule
            {
                value = "";
                files[] = 
                {
                    "${folderName}/scripts/5_Mission"
                };
            };
        };
    };
};
`;

            // Проверяем, что папка scripts существует, чтобы создать config.cpp
            try {
                await fs.access(configFolderPath);
                await fs.writeFile(path.join(configFolderPath, 'config.cpp'), configContent, { encoding: 'utf8' });
            } catch {
                // Если нет папки scripts — просто создаём config.cpp в корне новой папки
                await fs.writeFile(path.join(newFolderPath, 'config.cpp'), configContent, { encoding: 'utf8' });
            }

            vscode.window.showInformationMessage(`Папка '${folderName}' со структурой успешно создана.`);

            const configPath = (await fs.access(configFolderPath).then(() => path.join(configFolderPath, 'config.cpp')).catch(() => path.join(newFolderPath, 'config.cpp')));
            const document = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(document);

        } catch (err: any) {
            vscode.window.showErrorMessage(`Ошибка: ${err.message || err}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
