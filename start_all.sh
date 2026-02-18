#!/bin/bash

# Function to start a service
start_service() {
    local service_dir=$1
    local service_name=$2
    local log_file=$3
    local cmd=$4

    echo "Starting $service_name..."
    (cd "$service_dir" && $cmd > "$log_file" 2>&1) &
    local pid=$!
    echo "$service_name started with PID $pid. Logs: $log_file"
}

pkill -f "spring-boot"
pkill -f "uvicorn"
pkill -f "next"

echo "Killed previous instances."

# Backend Services
start_service "backend/auth-service" "Auth Service" "/tmp/auth.log" "mvn spring-boot:run"
start_service "backend/user-service" "User Service" "/tmp/user.log" "mvn spring-boot:run"
start_service "backend/content-service" "Content Service" "/tmp/content.log" "mvn spring-boot:run"
start_service "backend/comment-service" "Comment Service" "/tmp/comment.log" "mvn spring-boot:run"
start_service "backend/interaction-service" "Interaction Service" "/tmp/interaction.log" "mvn spring-boot:run"

# Scraper Service - use venv binary
start_service "backend/scraper-service" "Scraper Service" "/tmp/scraper.log" "venv/bin/uvicorn main:app --reload --port 8000"

# Frontend
start_service "frontend" "Frontend" "/tmp/frontend.log" "npm run dev"

echo "All services launch commands issued."
