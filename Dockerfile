FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies bez scripts
RUN npm install --ignore-scripts

# Pokreni bun postinstall PRIJE svega ostalog
RUN cd node_modules/bun && node install.js || true

# NE instaliraj globalni CLI - koristimo lokalni iz node_modules!
# RUN npm install -g @elizaos/cli@1.7.2  ← DELETE OVO

COPY . .

RUN npm run build

EXPOSE 3000

# Koristi lokalni elizaos iz node_modules
CMD ["npx", "elizaos", "start"]