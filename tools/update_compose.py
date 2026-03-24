import re

with open(r"d:\AI-DOCKER\AI-Assistant\infra\docker\docker-compose.yml", "r") as f:
    content = f.read()

# For services
#     build:
#       context: ../../
#       dockerfile: services/ai-brain/Dockerfile

def repl(match):
    indent = match.group(1)
    service_path = match.group(2)
    return f"{indent}build:\n{indent}  context: ../../{service_path}\n{indent}  dockerfile: Dockerfile"

content = re.sub(
    r"(\s+)build:\n\s+context: \.\./\.\.\n\s+dockerfile: (services/[^/]+)/Dockerfile",
    repl,
    content
)

content = re.sub(
    r"(\s+)build:\n\s+context: \.\./\.\.\n\s+dockerfile: (apps/[^/]+)/Dockerfile",
    repl,
    content
)

with open(r"d:\AI-DOCKER\AI-Assistant\infra\docker\docker-compose.yml", "w", newline='\n') as f:
    f.write(content)

print("Updated docker-compose.yml")
