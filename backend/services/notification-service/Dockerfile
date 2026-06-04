FROM node:18-alpine

WORKDIR /app

# Copy dependency files relative to build context (./backend)
COPY services/notification-service/package*.json ./

RUN npm install --production

# Copy source code relative to build context (./backend)
COPY services/notification-service/ ./

CMD ["node", "index.js"]
