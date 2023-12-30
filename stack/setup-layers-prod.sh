#!/bin/bash
set -e
echo "Setting up layers for production"
echo "Creating layers directory"

# Check if directoy exists. If it exists do nothing
if [ -d ./layers/chromium ]; then
    echo "Chrome directory layers exists."
else
    mkdir -p layers/chromium
    echo "Downloading chromium"
    wget https://github.com/Sparticuz/chromium/releases/download/v114.0.0/chromium-v114.0.0-layer.zip -O layers/chromium.zip

    echo "Unzipping chromium"
    unzip layers/chromium.zip -d layers/chromium
    rm layers/chromium.zip
fi

