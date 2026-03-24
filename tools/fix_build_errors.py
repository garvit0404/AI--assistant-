import os

def update_dockerfile(filepath, is_nextjs=False):
    if not os.path.exists(filepath):
        return
    
    if is_nextjs:
        content = """FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 8080

CMD ["npm", "start"]
"""
    else:
        # Determine entrypoint from existing file if possible
        with open(filepath, 'r') as f:
            old_content = f.read()
            entrypoint = "src/index.js"
            if 'src/server.js' in old_content:
                entrypoint = "src/server.js"
            elif 'index.js' in old_content and 'src/' not in old_content:
                entrypoint = "index.js"

        content = f"""FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY src ./src

CMD ["node", "{entrypoint}"]
"""
    
    with open(filepath, 'w', newline='\n') as f:
        f.write(content)
    print(f"Updated {filepath}")

# Services
services_dir = r"d:\AI-DOCKER\AI-Assistant\services"
for subdir in os.listdir(services_dir):
    dpath = os.path.join(services_dir, subdir)
    if os.path.isdir(dpath):
        update_dockerfile(os.path.join(dpath, "Dockerfile"))

# Apps
update_dockerfile(r"d:\AI-DOCKER\AI-Assistant\apps\telegram-bot\Dockerfile")
update_dockerfile(r"d:\AI-DOCKER\AI-Assistant\apps\dashboard-next\Dockerfile", is_nextjs=True)
