# Codex HOME AutoPatch

Patches the OpenAI Codex VS Code extension so each workspace uses:

```text
~/.codex/workspaces/<workspace-name>
```

## Install

Download the `.vsix` from a release:

```sh
code --install-extension codex-home-autopatch-0.0.1.vsix
```

For Remote-SSH, install Codex and this extension in the SSH extension host.

Note: on first use, your old VS Code Codex sessions may not show up in the Codex UI. That is expected: old sessions are still under `~/.codex/sessions` and are not moved automatically. If needed, copy them to your workspace home, e.g. `~/.codex/workspaces/<workspace-name>/sessions`, then reload VS Code and keep/archive what you want.

## Build

```sh
npx --yes @vscode/vsce package
```
