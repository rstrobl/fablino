FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 5173

# Use Vite dev server with HMR
CMD ["npm", "run", "dev"]