# Use Node.js Alpine as base image with security updates
FROM node:20-alpine

# Install Chromium and required dependencies with security fixes
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Set Chrome path environment variable
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install && \
    npm install -g tsx && \
    npm audit fix --force

# Copy all necessary source files and configuration
COPY src/backend ./src/backend
COPY src/common ./src/common
COPY stack/local ./stack/local
COPY tsconfig.base.json ./
COPY tsconfig.json ./

# Create data directory for runtime data
RUN mkdir -p /data

# Set the default command to run the queue server
CMD ["tsx", "stack/local/queue/index.ts"]
