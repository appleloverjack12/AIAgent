FROM node:20-slim

WORKDIR /app

# Copy package files INCLUDING lock file
COPY package.json package-lock.json ./

# Install without scripts
RUN npm install --ignore-scripts

# Run ONLY bun's postinstall
RUN cd node_modules/bun && node install.js || true

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]