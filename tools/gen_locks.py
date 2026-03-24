import os
import subprocess

dirs_to_lock = [
    r"d:\AI-DOCKER\AI-Assistant\services\ai-brain",
    r"d:\AI-DOCKER\AI-Assistant\services\api-server",
    r"d:\AI-DOCKER\AI-Assistant\services\intent-parser",
    r"d:\AI-DOCKER\AI-Assistant\services\planner-agent",
    r"d:\AI-DOCKER\AI-Assistant\services\policy-engine",
    r"d:\AI-DOCKER\AI-Assistant\services\permission-engine",
    r"d:\AI-DOCKER\AI-Assistant\services\observer-agent",
    r"d:\AI-DOCKER\AI-Assistant\services\executor-agent",
    r"d:\AI-DOCKER\AI-Assistant\apps\telegram-bot",
    r"d:\AI-DOCKER\AI-Assistant\apps\dashboard-next"
]

for d in dirs_to_lock:
    if os.path.exists(d):
        print(f"Creating package-lock.json in {d}")
        # Only run npm i --package-lock-only if package.json exists and package-lock.json does not
        if os.path.exists(os.path.join(d, "package.json")) and not os.path.exists(os.path.join(d, "package-lock.json")):
            subprocess.run(["npm", "install", "--package-lock-only"], cwd=d, shell=True)
