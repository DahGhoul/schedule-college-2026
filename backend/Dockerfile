FROM node:20-bullseye-slim

WORKDIR /app

ENV NODE_ENV=development
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install system dependencies for Prisma and other tools
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
