#!/bin/bash

# Script to start the Next.js development server with appropriate Node.js version
echo "Setting up Next.js development environment..."

# Use a compatible Node.js version for this project only
export NODE_VERSION=18.19.1
export N_PREFIX="$PWD/.n"
mkdir -p $N_PREFIX/bin

# Check if we already have the correct Node.js version
if [ -f "$N_PREFIX/bin/node" ]; then
  NODE_CURRENT=$($N_PREFIX/bin/node -v)
  if [ "$NODE_CURRENT" == "v$NODE_VERSION" ]; then
    echo "Using cached Node.js $NODE_VERSION"
  else
    echo "Installing Node.js $NODE_VERSION for this project..."
    n $NODE_VERSION
  fi
else
  echo "Installing Node.js $NODE_VERSION for this project..."
  n $NODE_VERSION
fi

# Set PATH to use our local Node.js version
export PATH="$N_PREFIX/bin:$PATH"

# Verify Node.js version
echo "Using Node.js $(node -v)"

# Load environment variables
source ./environment/index.js

# Start Next.js
echo "Starting Next.js development server..."
node_modules/.bin/next dev -p 3000
