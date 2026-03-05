FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Create .npmrc to skip optional packages
RUN echo "omit=optional" > .npmrc

# Install dependencies
RUN npm ci --omit=optional 2>&1 || npm install --omit=optional

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]