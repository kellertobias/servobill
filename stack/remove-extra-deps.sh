#!/bin/bash

echo "Removing extra dependencies that should not go into the AWS bundle..."
npm r -D pg sqlite sqlite3
npm r -S pg sqlite sqlite3
echo "Done!"