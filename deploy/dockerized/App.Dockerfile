# Base image with security updates
FROM node:20-slim-bullseye

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and fix vulnerabilities
RUN npm ci && \
    npm audit fix --force

# Copy the entire project
COPY . .

# Generate GraphQL types
RUN npm run gql:type

# Build stack index
RUN npx tsc stack/build-index/index.ts

# Build Next.js application
RUN npm run build

# Clean up build artifacts and cache
RUN rm -rf .next/cache && \
    npm cache clean --force

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["next", "start"] 