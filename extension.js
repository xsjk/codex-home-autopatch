const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const PATCH_OWNER = "xsjk.codex-home-autopatch";
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

async function activate() {
    const mainPath = path.join(vscode.extensions.getExtension(TARGET).extensionPath, "out", "extension.js");
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
