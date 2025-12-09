FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

# Start with the compiled TypeScript entry point
CMD ["node", "dist/index.js"]
