FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install without scripts
RUN npm install --ignore-scripts

# Run ONLY bun's postinstall (skip Ollama)
RUN cd node_modules/bun && node install.js || true

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]