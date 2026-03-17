# Use Node 22 LTS
FROM node:22-bookworm

# Set working directory
WORKDIR /app

# Copy all package files (workspace structure)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN npm install --workspaces --include-workspace-root

# Copy backend source code
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build TypeScript
RUN npm run build --workspace=backend

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
