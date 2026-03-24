import re

with open(r"d:\AI-DOCKER\AI-Assistant\infra\docker\docker-compose.yml", "r") as f:
    lines = f.readlines()

out_lines = []
in_service = False
service_name = ""
has_volumes = False

svc_re = re.compile(r"^  ([\w-]+):$")

for line in lines:
    m = svc_re.match(line)
    if m:
        service_name = m.group(1)
        in_service = True
        out_lines.append(line)
        continue
    
    if line.strip() == "volumes:":
        if in_service: # it's a volume array under a service
            pass
        out_lines.append(line)
        continue
    
    # We want to insert `volumes: \n      - logs:/app/logs` if not present when we exit a service block, but parsing YAML like this is error-prone.
    # Let's just use a better parsing approach.

