FROM node:18-alpine

WORKDIR /app

# Copy dependency files relative to build context (./backend)
COPY services/auth-service/package*.json ./

RUN npm install --production

# Copy source code relative to build context (./backend)
COPY services/auth-service/ ./

EXPOSE 5001

CMD ["node", "index.js"]
