# Use Node.js LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080
ENV NODE_ENV=production

# Start the backend
CMD ["npm", "start"]