# Base image with security updates and minimal size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./
COPY package-lock.json ./

# Install dependencies and fix vulnerabilities
RUN npm ci
RUN npm audit fix --force || true

# Copy the entire project
COPY . .

# Generate GraphQL types
RUN npm run gql:type

# Build stack index with proper TypeScript configuration
RUN npx tsx stack/build-index/index.ts

# Build Next.js application
RUN npm run build

# Clean up build artifacts, cache and build dependencies
RUN rm -rf .next/cache && \
    npm cache clean --force && \
    apk del python3 make g++

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["next", "start"] 