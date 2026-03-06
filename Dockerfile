FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

# Install without scripts
RUN npm install --ignore-scripts

# NUCLEAR FIX: Delete node-fetch v3 and force install v2 everywhere
RUN find node_modules -name "node-fetch" -type d -exec rm -rf {} + || true
RUN npm install node-fetch@2.7.0 --legacy-peer-deps

# Run bun postinstall
RUN cd node_modules/bun && node install.js || true

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]