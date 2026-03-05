FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install WITHOUT running any postinstall scripts (skips Ollama)
RUN npm install --ignore-scripts

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]