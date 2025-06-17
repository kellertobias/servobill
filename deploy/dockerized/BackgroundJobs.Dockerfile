# Use Node.js as base image with security updates
FROM node:20-slim-bullseye

# Install Chromium and required dependencies with security fixes
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set Chrome path environment variable
ENV CHROME_PATH=/usr/bin/chromium

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
