# Use Node.js LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies using workspaces
RUN npm install --workspaces --include-workspace-root

# Copy backend source
COPY backend ./backend

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080
ENV NODE_ENV=production

# Start the backend
CMD ["npm", "start"]