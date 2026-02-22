# Multi-stage build for NestJS
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci --only=production && npm ci

# Copy source code
COPY src/ src/
COPY prisma/ prisma/

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies needed for audio processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema and generate client
COPY prisma/ prisma/
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p covers/og
RUN mkdir -p ../audio

# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]