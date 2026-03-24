import re
import os

services_ports = {
    "services/ai-brain/Dockerfile": 3003,
    "services/api-server/Dockerfile": 3001,
    "services/intent-parser/Dockerfile": 3007,
    "services/planner-agent/Dockerfile": 3008,
    "services/policy-engine/Dockerfile": 3005,
    "services/permission-engine/Dockerfile": 3006,
    "services/observer-agent/Dockerfile": 3009,
    "services/executor-agent/Dockerfile": 3004,
    "apps/telegram-bot/Dockerfile": 3011,
}

for filepath, port in services_ports.items():
    full_path = os.path.join(r"d:\AI-DOCKER\AI-Assistant", filepath)
    if os.path.exists(full_path):
        with open(full_path, "r") as f:
            lines = f.readlines()
        
        # Check if EXPOSE already exists
        has_expose = any("EXPOSE" in line for line in lines)
        
        if not has_expose:
            # Find CMD line
            cmd_index = -1
            for i, line in enumerate(lines):
                if line.startswith("CMD"):
                    cmd_index = i
                    break
            
            if cmd_index != -1:
                # Insert EXPOSE right before CMD
                lines.insert(cmd_index, f"EXPOSE {port}\n")
                
                with open(full_path, "w", newline='\n') as f:
                    f.writelines(lines)
                print(f"Added EXPOSE {port} to {filepath}")
        else:
            print(f"{filepath} already has EXPOSE")
