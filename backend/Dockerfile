FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Create directories that might be needed
RUN mkdir -p covers/og ../audio/lines

# Copy source code
COPY . .

EXPOSE 3001

# Use nodemon for development with live reload
CMD ["npm", "run", "dev"]