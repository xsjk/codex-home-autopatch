const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const PATCH_OWNER = "xsjk.codex-home-autopatch";
const REPLACEMENT = "xsjk.codex-workspace-filter";
const MIGRATION_URL = "https://github.com/xsjk/codex-home-autopatch#migration";
const TARGET = "openai.chatgpt";
const MARK = "/* codex-home-autopatch:begin */";
const SNIPPET = `${MARK}
(() => {
    const fs = require("fs"), path = require("path"), vscode = require("vscode"), os = require("os");

    if (!vscode.extensions.getExtension("${PATCH_OWNER}")) {
        const backup = __filename + ".bak";
        if (fs.existsSync(backup)) fs.copyFileSync(backup, __filename);
        return;
    }

    const name = vscode.workspace.name;
    const home = os.homedir();
    if (!name || !home) return;

    const src = path.join(home, ".codex");
    const dst = path.join(src, "workspaces", name);

    fs.mkdirSync(dst, { recursive: true });

    const config = vscode.workspace.getConfiguration("codex-home-autopatch");
    const linkEntries = config.get("linkEntries");
    const copyEntries = config.get("copyEntries");
    const syncEntries = (entries, sync) => {
        for (const entry of entries) {
            const from = path.join(src, entry);
            const to = path.join(dst, entry);
            if (!fs.existsSync(from) || fs.existsSync(to)) continue;

            fs.mkdirSync(path.dirname(to), { recursive: true });
            sync(from, to);
        }
    };

    syncEntries(linkEntries, (from, to) => {
        const isDir = fs.statSync(from).isDirectory();
        fs.symlinkSync(from, to, isDir && process.platform === "win32" ? "junction" : isDir ? "dir" : "file");
    });

    syncEntries(copyEntries, (from, to) => {
        fs.cpSync(from, to, { recursive: true });
    });

    process.env.CODEX_HOME = dst;
})();
/* codex-home-autopatch:end */`;

function restorePatchedCodex(mainPath) {
    const source = fs.readFileSync(mainPath, "utf8");
    if (!source.includes(MARK)) return false;

    const backupPath = `${mainPath}.bak`;
    if (!fs.existsSync(backupPath)) return false;

    fs.copyFileSync(backupPath, mainPath);
    return true;
}

async function showMigrationNotice(context, key, message) {
    if (context.globalState.get(key)) return;

    const action = await vscode.window.showWarningMessage(message, "Read migration");
    if (!action) return;

    await context.globalState.update(key, true);
    await vscode.env.openExternal(vscode.Uri.parse(MIGRATION_URL));
}

async function activate(context) {
    const targetExtension = vscode.extensions.getExtension(TARGET);
    if (!targetExtension) {
        vscode.window.showWarningMessage("Codex HOME AutoPatch could not find the OpenAI Codex extension.");
        return;
    }

    const mainPath = path.join(targetExtension.extensionPath, "out", "extension.js");
    if (vscode.extensions.getExtension(REPLACEMENT)) {
        const restored = restorePatchedCodex(mainPath);
        await showMigrationNotice(
            context,
            "codexHomeAutopatchReplacementNoticeShown",
            "Codex HOME AutoPatch is deprecated because splitting CODEX_HOME by workspace name makes codex CLI usage awkward and leaves sessions under ~/.codex/workspaces. Read the migration guide before continuing.",
        );
        if (restored) {
            await vscode.commands.executeCommand("workbench.action.restartExtensionHost");
        }
        return;
    }

    await showMigrationNotice(
        context,
        "codexHomeAutopatchDeprecationNoticeShown",
        "Codex HOME AutoPatch is deprecated because splitting CODEX_HOME by workspace name makes codex CLI usage awkward and leaves sessions under ~/.codex/workspaces. Read the migration guide before installing Codex Workspace Filter.",
    );

    const source = fs.readFileSync(mainPath, "utf8");
    if (source.includes(MARK)) return;

    const backupPath = `${mainPath}.bak`;
    if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, source, "utf8");
    }

    fs.writeFileSync(mainPath, source.replace('"use strict";', `"use strict";\n\n${SNIPPET}\n\n`), "utf8");
    await vscode.commands.executeCommand("workbench.action.restartExtensionHost");
}

module.exports = { activate };
