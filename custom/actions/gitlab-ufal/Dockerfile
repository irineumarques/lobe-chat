FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN npm install && npm run build

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    apk add --no-cache curl

USER nodejs

EXPOSE 3102

ENV NODE_ENV=production
ENV GITLAB_PORT=3102
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]