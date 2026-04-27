import os
import json
from pathlib import Path

knowledge_dir = Path.home() / ".chatter" / "knowledge"
if not knowledge_dir.exists():
    print("Knowledge directory not found")
    exit(0)

kbs_by_name = {}
files = list(knowledge_dir.glob("*.json"))

for f in files:
    try:
        data = json.loads(f.read_text())
        name = data.get("name")
        if not name:
            continue
        
        if name not in kbs_by_name:
            kbs_by_name[name] = []
        
        kbs_by_name[name].append({
            "file": f,
            "id": data.get("id"),
            "updated_at": data.get("updated_at", 0),
            "file_count": len(data.get("files", []))
        })
    except Exception as e:
        print(f"Error reading {f}: {e}")

for name, items in kbs_by_name.items():
    if len(items) > 1:
        print(f"Found duplicates for KB '{name}':")
        # Sort by file_count (desc) then updated_at (desc) to keep the most "complete" one
        items.sort(key=lambda x: (x["file_count"], x["updated_at"]), reverse=True)
        
        to_keep = items[0]
        to_delete = items[1:]
        
        print(f"  Keeping: {to_keep['file'].name} (ID: {to_keep['id']}, Items: {to_keep['file_count']})")
        for item in to_delete:
            print(f"  Deleting: {item['file'].name} (ID: {item['id']}, Items: {item['file_count']})")
            try:
                item['file'].unlink()
            except Exception as e:
                print(f"    Failed to delete {item['file'].name}: {e}")

print("Cleanup complete")
