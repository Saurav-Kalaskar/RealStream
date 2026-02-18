#!/bin/bash
cd "$(dirname "$0")/../backend/comment-service" || exit
echo "Starting Comment Service..."
mvn spring-boot:run
