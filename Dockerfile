FROM node:20-slim

WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Install dependencies WITH scripts (this is important)
RUN npm install

# FORCE node-fetch v2 by reinstalling it
RUN npm install node-fetch@2.7.0 --save --force

# Now build
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]