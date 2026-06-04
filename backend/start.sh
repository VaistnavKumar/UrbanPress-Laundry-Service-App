#!/bin/bash

# Do NOT use set -e — we want all services to keep running even if one crashes
echo "=== UrbanPress Backend Starting ==="

# Export fixed internal ports for each microservice
export AUTH_PORT=5001
export BOOKING_PORT=5002
export ORDER_PORT=5003
export PAYMENT_PORT=5004
export NOTIFICATION_PORT=5005

echo "Launching Auth Service on port $AUTH_PORT..."
PORT=$AUTH_PORT node /usr/src/app/services/auth-service/index.js &

echo "Launching Booking Service on port $BOOKING_PORT..."
PORT=$BOOKING_PORT node /usr/src/app/services/booking-service/index.js &

echo "Launching Order Service on port $ORDER_PORT..."
PORT=$ORDER_PORT node /usr/src/app/services/order-service/index.js &

echo "Launching Payment Service on port $PAYMENT_PORT..."
PORT=$PAYMENT_PORT node /usr/src/app/services/payment-service/index.js &

echo "Launching Notification Service on port $NOTIFICATION_PORT..."
PORT=$NOTIFICATION_PORT node /usr/src/app/services/notification-service/index.js &

echo "=== Configuring Nginx Gateway ==="

# Render injects PORT dynamically (usually 10000, not 5000).
# We MUST listen on Render's $PORT for traffic to reach our container.
NGINX_PORT=${PORT:-10000}
echo "Nginx will listen on port $NGINX_PORT"
sed -i "s/listen 5000;/listen $NGINX_PORT;/g" /etc/nginx/nginx.conf

# Give microservices 3 seconds to bind to their ports before Nginx starts
sleep 3

echo "=== Launching Nginx in foreground ==="
nginx -g "daemon off;"
