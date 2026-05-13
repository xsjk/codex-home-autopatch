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
sources = [path.expanduser() for path in opts.source] or sorted(path.parent for path in workspace_root.glob("*/session_index.jsonl"))


homes = [(target, "target"), *((source, source.name) for source in sources)]
names = {}
for home, _ in homes:
    for row in map(json.loads, (home / "session_index.jsonl").read_text(encoding="utf-8").splitlines()):
        sid = row["id"]
        if row["thread_name"] != sid and (sid not in names or row["updated_at"] > names[sid]["updated_at"]):
            names[sid] = row


def scan(home, label):
    root = home / "sessions"
    for file in sorted(root.rglob("*.jsonl")):
        with file.open(encoding="utf-8") as f:
            first = f.readline()
            last = first
            for last in f:
                pass
        meta = json.loads(first)["payload"]
        sid = meta["id"]
        name = names[sid]["thread_name"] if sid in names else ""
        yield Session(sid, file, file.relative_to(root), label, json.loads(last)["timestamp"], name)


groups = defaultdict(list)
for home, label in homes:
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
    for session in (session for action, session in rows if action == "drop" and session.label == "target"):
        session.file.unlink()
    for keep in kept:
        dest = target / "sessions" / keep.rel
        if keep.file != dest:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(keep.file, dest)
    index_file = target / "session_index.jsonl"
    index_file.parent.mkdir(parents=True, exist_ok=True)
    named = [{"id": keep.id, "thread_name": keep.name, "updated_at": names[keep.id]["updated_at"]} for keep in kept if keep.name]
    named.sort(key=lambda row: (row["updated_at"], row["id"]))
    index_file.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in named), encoding="utf-8")
    print("Applied.")
