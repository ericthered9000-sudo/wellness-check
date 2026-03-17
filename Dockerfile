# Use Node 22 LTS
FROM node:22-bookworm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install all dependencies (including workspaces)
RUN npm install

# Copy backend source
COPY backend/ ./backend/

# Build TypeScript
RUN cd backend && npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
