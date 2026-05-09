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

    for (const entry of ["auth.json", "config.toml", "AGENTS.md", "rules", "skills", "plugins", "agents"]) {
        const from = path.join(src, entry);
        const to = path.join(dst, entry);
        if (!fs.existsSync(from) || fs.existsSync(to)) continue;

        const isDir = fs.statSync(from).isDirectory();
        fs.symlinkSync(from, to, isDir && process.platform === "win32" ? "junction" : isDir ? "dir" : "file");
    }

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
