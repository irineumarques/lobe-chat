FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install && npm run build

COPY src/ ./src/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3103

ENV NODE_ENV=production
ENV PORT=3103
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]