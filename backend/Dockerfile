FROM node:20-bullseye-slim AS build
WORKDIR /app
ENV NODE_ENV=development
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g tsx prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 4000
CMD ["node", "-r", "module-alias/register", "dist/index.js"]    