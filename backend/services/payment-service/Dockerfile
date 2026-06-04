FROM node:18-alpine

WORKDIR /app

# Copy dependency files relative to build context (./backend)
COPY services/payment-service/package*.json ./

RUN npm install --production

# Copy source code relative to build context (./backend)
COPY services/payment-service/ ./

EXPOSE 5004

CMD ["node", "index.js"]
