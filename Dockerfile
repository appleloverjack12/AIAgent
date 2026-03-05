FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

# Install without scripts
RUN npm install --ignore-scripts

# FORCE node-fetch v2 (override telegraf's v3)
RUN npm install node-fetch@2.7.0 --save --legacy-peer-deps

# Run bun postinstall
RUN cd node_modules/bun && node install.js || true

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]