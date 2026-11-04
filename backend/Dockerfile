# Use Node.js LTS
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files for root AND backend (npm workspaces)
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080
ENV NODE_ENV=production

# Start the backend
CMD ["npm", "start"]
