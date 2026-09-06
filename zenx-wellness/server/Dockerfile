# Plain Node ESM app, no build step — a single stage is enough.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Report uploads (server/src/middleware/upload.js) land here — created so the app doesn't need
# to mkdir at runtime. On most hosts this is ephemeral storage; see README's deploy notes.
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
