"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
function activate(context) {
    const disposable = vscode.commands.registerCommand('extension.DayZ.CreateTemplateFolder', async (uri) => {
        try {
            let rootPath;
            if (uri && uri.fsPath) {
                rootPath = uri.fsPath;
            }
            else {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    vscode.window.showErrorMessage('Откройте рабочую папку в VS Code');
                    return;
                }
                rootPath = workspaceFolders[0].uri.fsPath;
            }
            const folderName = await vscode.window.showInputBox({
                prompt: 'Введите имя новой папки (будет создана внутри выбранной)',
                validateInput: (text) => text.trim() === '' ? 'Имя не может быть пустым' : null
            });
            if (!folderName) {
                vscode.window.showWarningMessage('Отменено создание папки');
                return;
            }
            // Читаем настройки
            const config = vscode.workspace.getConfiguration('DayZ.CreateTemplateFolder');
            const authorName = config.get('author') || 'Sladya';
            const folders = config.get('folders') || ['scripts'];
            const subfolders = config.get('subfolders') || {
                scripts: ['4_World', '3_Game', '5_Mission']
            };
            const newFolderPath = path.join(rootPath, folderName);
            try {
                await fs.access(newFolderPath);
                vscode.window.showErrorMessage(`Папка "${folderName}" уже существует`);
                return;
            }
            catch {
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
            // Создаём config.cpp в корне новой папки
            const configContent = `class CfgPatches
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
            await fs.writeFile(path.join(newFolderPath, 'config.cpp'), configContent, { encoding: 'utf8' });
            vscode.window.showInformationMessage(`Папка '${folderName}' со структурой успешно создана.`);
            const configPath = path.join(newFolderPath, 'config.cpp');
            const document = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(document);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Ошибка: ${err.message || err}`);
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map