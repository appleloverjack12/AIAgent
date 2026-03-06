FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --ignore-scripts

# Delete ALL node-fetch v3 instances - be more aggressive
RUN find node_modules -type f -name "package.json" -path "*/node-fetch/*" -exec sh -c 'dir=$(dirname "{}"); rm -rf "$dir"' \;

# Install v2 globally
RUN npm install node-fetch@2.7.0 --legacy-peer-deps

# ALSO patch it directly into telegraf if it exists
RUN if [ -d "node_modules/telegraf/node_modules" ]; then \
      cd node_modules/telegraf && \
      npm install node-fetch@2.7.0 --legacy-peer-deps --no-save; \
    fi

RUN cd node_modules/bun && node install.js || true

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]