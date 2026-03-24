import os
import json

services_dir = r"d:\AI-DOCKER\AI-Assistant\services"

dockerfile_template = """FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup
USER nodeuser

CMD ["node", "{entrypoint}"]
"""

# Iterate over all subdirs in services
for subdir in os.listdir(services_dir):
    subdir_path = os.path.join(services_dir, subdir)
    if os.path.isdir(subdir_path):
        package_json_path = os.path.join(subdir_path, "package.json")
        if os.path.exists(package_json_path):
            with open(package_json_path, "r") as f:
                try:
                    pkg = json.load(f)
                    entrypoint = pkg.get("main", "src/index.js")
                except:
                    entrypoint = "src/index.js"
            
            # Special case for api-server which uses src/server.js
            if subdir == 'api-server':
                entrypoint = 'src/server.js'

            dockerfile_path = os.path.join(subdir_path, "Dockerfile")
            with open(dockerfile_path, "w", newline='\n') as f:
                f.write(dockerfile_template.format(entrypoint=entrypoint))
            print(f"Written Dockerfile for {subdir} with entrypoint {entrypoint}")

