import argparse
import json
import shutil
from collections import defaultdict, namedtuple
from operator import attrgetter
from pathlib import Path

# Assumes Codex rollouts: first JSONL line is session_meta; index rows only name sessions.
Session = namedtuple("Session", "id file rel label updated name")

parser = argparse.ArgumentParser()
parser.add_argument("--target", type=Path, default=Path("~/.codex"))
parser.add_argument("--source", type=Path, action="append", default=[])
opts = parser.parse_args()

target = opts.target.expanduser()
workspace_root = target / "workspaces"
sources = [path.expanduser() for path in opts.source] or (sorted(path for path in workspace_root.iterdir() if path.is_dir()) if workspace_root.exists() else [])


def scan(home, label):
    index_file = home / "session_index.jsonl"
    names = {row["id"]: row["thread_name"] for row in map(json.loads, index_file.read_text(encoding="utf-8").splitlines())} if index_file.exists() else {}
    root = home / "sessions"
    for file in sorted(root.rglob("*.jsonl")) if root.exists() else []:
        with file.open(encoding="utf-8") as f:
            first = f.readline()
            last = first
            for last in f:
                pass
        meta = json.loads(first)["payload"]
        sid = meta["id"]
        yield Session(sid, file, file.relative_to(root), label, json.loads(last)["timestamp"], names[sid] if sid in names else sid)


groups = defaultdict(list)
for home, label in [(target, "target"), *((source, source.name) for source in sources)]:
    for session in scan(home, label):
        groups[session.id].append(session)

kept, rows = [], []
for copies in groups.values():
    keep = max(copies, key=attrgetter("updated"))
    kept.append(keep)
    rows.extend(("keep" if copy.file == keep.file else "drop", copy) for copy in copies)
kept.sort(key=attrgetter("updated", "id"))
rows.sort(key=lambda row: (row[1].id, row[0] != "keep", row[1].updated))

source_width = max(map(len, ["source", *(session.label for _, session in rows)]))
action_width = len("action")
updated_width = max(map(len, ["updated", *(session.updated for _, session in rows)]))
print(f"MERGE PLAN target={target}")
print(f"summary: sources={len(sources)} sessions={len(kept)} keep={len(kept)} drop={len(rows) - len(kept)}")

print("\nActions:")
print(f"  {'action':<{action_width}} {'updated':<{updated_width}} {'session':<36} {'source':<{source_width}} name")
for action, session in rows:
    print(f"  {action:<{action_width}} {session.updated:<{updated_width}} {session.id:<36} {session.label:<{source_width}} {session.name}")

if input("\nApply this plan? [y/N] ").strip().lower() != "y":
    print("No files changed.")
else:
    for action, session in rows:
        if action == "drop" and session.label == "target":
            session.file.unlink()
    for keep in kept:
        dest = target / "sessions" / keep.rel
        if keep.file != dest:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(keep.file, dest)
    index_file = target / "session_index.jsonl"
    index_file.parent.mkdir(parents=True, exist_ok=True)
    index_file.write_text("".join(json.dumps({"id": keep.id, "thread_name": keep.name, "updated_at": keep.updated}, ensure_ascii=False) + "\n" for keep in kept), encoding="utf-8")
    print("Applied.")
