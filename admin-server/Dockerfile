# Plain Node ESM app, no build step — a single stage is enough.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Company logo uploads (src/middleware/upload.js) land here — created so the app doesn't need to
# mkdir at runtime. On most hosts this is ephemeral storage; needs S3/R2 (or a persistent disk)
# for real use, same caveat as wellness-app's own report uploads.
RUN mkdir -p uploads/company-logos

ENV NODE_ENV=production
EXPOSE 4001

CMD ["node", "server.js"]
