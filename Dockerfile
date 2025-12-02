# Use Node.js 20.x as specified in package.json
FROM node:20-alpine

# Install bun
RUN npm install -g bun

# Set working directory
WORKDIR /app

# Copy all source files first
COPY . .

# Install dependencies (skip postinstall to avoid build failure)
RUN bun install --ignore-scripts

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.cjs"]