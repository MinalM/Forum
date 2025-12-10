# Stage 1: Build the React Client
FROM node:18-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Server
FROM node:18-alpine
WORKDIR /app

# Copy server dependencies and install
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy built client from Stage 1 to the location expected by the server
# Server expects ../client/build relative to server root
COPY --from=client-build /app/client/build ../client/build

# Set environment variables
ENV NODE_ENV=production

EXPOSE 5000

# Start the server
CMD ["node", "dist/index.js"]
