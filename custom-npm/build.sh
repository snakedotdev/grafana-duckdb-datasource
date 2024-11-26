#!/bin/bash

# Default repository name if not provided
REPO=${1:-"snakedotdev"}
VERSION="0.1.0"
ACTION=${2:-"push"}  # Default to push if not specified

# Enable Docker BuildKit for better multi-arch support
export DOCKER_BUILDKIT=1

# Create and use a new builder instance
docker buildx create --use

# Build and optionally push multi-arch images
if [ "$ACTION" = "push" ]; then
  PUSH_FLAG="--push"
else
  PUSH_FLAG="--load"
fi

docker buildx build \
  --platform linux/amd64,linux/arm64/v8 \
  -t ghcr.io/${REPO}/grafana-duckdb-datasource-npm:${VERSION} \
  ${PUSH_FLAG} \
  .
