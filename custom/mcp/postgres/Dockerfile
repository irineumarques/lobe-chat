FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN npm install && npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    apk add --no-cache curl

USER nodejs

EXPOSE 3101

ENV NODE_ENV=production
ENV PG_PORT=3101
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]