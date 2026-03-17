# Use Node 22 LTS
FROM node:22-bookworm

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./backend/

# Install all dependencies
RUN npm install --workspaces

# Copy backend source code
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build TypeScript
RUN cd backend && npm run build

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
