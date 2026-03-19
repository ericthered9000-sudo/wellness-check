#!/bin/sh

# Delete old database to force schema recreation
if [ -f "./wellness.db" ]; then
  echo "Removing old database..."
  rm -f ./wellness.db
fi

# Start the app
exec npm start
