# Codex HOME AutoPatch

Patches the OpenAI Codex VS Code extension so each workspace uses:

```text
~/.codex/workspaces/<workspace-name>
```

## Scope

Important: **use only global Enable/Disable for this extension**. Do not use workspace-specific Enable/Disable. The extension must run in the workspace/remote extension host, but the patch itself affects the whole VS Code extension host, not just one workspace.

Note: on first use, your old VS Code Codex sessions may not show up in the Codex UI. That is expected: old sessions are still under `~/.codex/sessions` and are not moved automatically. If needed, copy them to your workspace home, e.g. `~/.codex/workspaces/<workspace-name>/sessions`, then restart the extension host and keep/archive what you want.

## Configuration

`codex-home-autopatch.entries` defaults to:

```json
["auth.json", "config.toml", "AGENTS.md", "rules", "skills", "plugins", "agents"]
```

Add or remove relative paths under `~/.codex`. Restart the extension host after changing it.
