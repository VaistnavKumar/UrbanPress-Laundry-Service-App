FROM node:18-alpine
LABEL build_version="2026-06-04-v3"

# Install nginx and bash
RUN apk add --no-cache nginx bash

# Configure Nginx
COPY api-gateway/nginx.conf /etc/nginx/nginx.conf

# Create app directory
WORKDIR /usr/src/app

# Copy the entire backend source code
COPY . .

# Install production dependencies for each microservice
RUN cd services/auth-service && npm install --production
RUN cd services/booking-service && npm install --production
RUN cd services/notification-service && npm install --production
RUN cd services/order-service && npm install --production
RUN cd services/payment-service && npm install --production

# Ensure logs and run directories exist for Nginx
RUN mkdir -p /run/nginx /var/log/nginx

# Ensure start.sh has execute permissions
RUN chmod +x start.sh

# Expose Nginx Gateway port
EXPOSE 5000

# Set start script
CMD ["./start.sh"]
