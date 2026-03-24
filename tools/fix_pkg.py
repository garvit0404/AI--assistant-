import json
import os

files_to_fix = [
    r"d:\AI-DOCKER\AI-Assistant\services\tool-registry\package.json",
    r"d:\AI-DOCKER\AI-Assistant\services\task-queue\package.json",
    r"d:\AI-DOCKER\AI-Assistant\services\observer-agent\package.json",
]

for filepath in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            data = json.load(f)
        
        changed = False
        if "dependencies" in data:
            for k in list(data["dependencies"].keys()):
                if data["dependencies"][k].startswith("file:"):
                    del data["dependencies"][k]
                    changed = True
        
        if changed:
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            print(f"Fixed {filepath}")
