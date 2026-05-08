const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const MARK_BEGIN = "/* codex-home-autopatch:begin */";
const INJECTED_SNIPPET = `${MARK_BEGIN}
(() => {
    const fs = require("fs"), path = require("path"), vscode = require("vscode"), os = require("os");

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
    const target = vscode.extensions.getExtension("openai.chatgpt");
    const mainPath = path.join(target.extensionPath, "out", "extension.js");
    const source = fs.readFileSync(mainPath, "utf8");

    if (source.includes(MARK_BEGIN)) {
        return;
    }

    const patched = source.replace(
        '"use strict";',
        `"use strict";\n\n${INJECTED_SNIPPET}\n\n`
    );

    fs.writeFileSync(mainPath, patched, "utf8");
    const action = await vscode.window.showInformationMessage(
        "Codex HOME AutoPatch applied. Reload this window now?",
        { modal: true },
        "Reload Window"
    );

    if (action === "Reload Window") {
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
}

module.exports = { activate };
