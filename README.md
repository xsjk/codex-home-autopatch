# Codex HOME AutoPatch

> Deprecated: this workaround splits `CODEX_HOME` by unstable `workspace.name` values, which makes `codex` CLI usage awkward and leaves session history under `~/.codex/workspaces`. Read [Migration](#migration) before installing [Codex Workspace Filter](https://github.com/xsjk/codex-workspace-filter).

Patches the OpenAI Codex VS Code extension so each workspace uses:

```text
~/.codex/workspaces/<workspace-name>
```

## Scope

Important: **use only global Enable/Disable for this extension**. Do not use workspace-specific Enable/Disable. The extension must run in the workspace/remote extension host, but the patch itself affects the whole VS Code extension host, not just one workspace.

## Configuration

`codex-home-autopatch.linkEntries` defaults to:

```json
["auth.json", "config.toml", "AGENTS.md", "rules", "skills", "plugins", "agents"]
```

These entries are linked because they are shared config, rules, skills, and plugin assets. Add or remove relative paths under `~/.codex`. Restart the extension host after changing it.

`codex-home-autopatch.copyEntries` defaults to:

```json
["sessions", "session_index.jsonl"]
```

These entries are copied instead of linked so each workspace can keep independent session history. On first use, they are recursively copied when the destination does not already exist. After that migration, archive any sessions that do not belong to the current workspace and keep the ones you want.

## Migration

Before installing `xsjk.codex-workspace-filter`, uninstall `xsjk.codex-home-autopatch`, then run `python3 scripts/merge-codex-workspaces.py`; it asks before merging workspace `sessions` into `~/.codex/sessions` and rebuilding `session_index.jsonl`. After confirming normal Codex usage, `~/.codex/workspaces` can be deleted.
