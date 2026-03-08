FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --ignore-scripts

# FORCE install latest CLI
RUN npm install -g @elizaos/cli@1.7.2

RUN cd node_modules/bun && node install.js || true

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["elizaos", "start"]