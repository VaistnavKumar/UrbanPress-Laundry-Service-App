#!/bin/bash

# Exit on any error during startup configuration
set -e

echo "=== Starting Microservices in Background ==="

echo "Launching Auth Service..."
cd /usr/src/app/services/auth-service
node index.js &

echo "Launching Booking Service..."
cd /usr/src/app/services/booking-service
node index.js &

echo "Launching Order Service..."
cd /usr/src/app/services/order-service
node index.js &

echo "Launching Payment Service..."
cd /usr/src/app/services/payment-service
node index.js &

echo "Launching Notification Service..."
cd /usr/src/app/services/notification-service
node index.js &

echo "=== Configuring Nginx Gateway ==="
# Render injects the PORT environment variable dynamically.
# Replace the default port 5000 in nginx.conf with Render's PORT.
if [ -n "$PORT" ]; then
  echo "Setting Nginx gateway to listen on Render port $PORT"
  sed -i "s/listen 5000;/listen $PORT;/g" /etc/nginx/nginx.conf
else
  echo "No PORT env variable injected, using default 5000"
fi

echo "Launching Nginx in foreground..."
nginx -g "daemon off;"
