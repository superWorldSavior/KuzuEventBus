#!/bin/bash
set -e

# Fix permissions on /data/kuzu if running as root, then switch to appuser
if [ "$(id -u)" = "0" ]; then
    echo "Running as root - fixing /data/kuzu permissions..."
    mkdir -p /data/kuzu
    chown -R appuser:appuser /data/kuzu
    echo "Permissions fixed. Switching to appuser and executing: $@"
    exec gosu appuser "$@"
else
    echo "Running as appuser - ensuring /data/kuzu exists..."
    mkdir -p /data/kuzu 2>/dev/null || true
    echo "Executing: $@"
    exec "$@"
fi
