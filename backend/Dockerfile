FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Remove any cached dist and database
RUN rm -rf dist wellness.db

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start with fresh database
CMD ["sh", "-c", "rm -f ./wellness.db && npm start"]
