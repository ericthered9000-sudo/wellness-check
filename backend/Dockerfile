# HomeBeacon backend standalone build (context = backend/ only)
FROM node:22-slim

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install && npm rebuild better-sqlite3

COPY . .
RUN npm run build

EXPOSE 3000
CMD [ "npm", "run", "start" ]
