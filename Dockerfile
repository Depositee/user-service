FROM node:16.18-buster-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3773

CMD ["bun", "run", "dev"]
