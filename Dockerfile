FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update
RUN apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

COPY package*.json ./
RUN npm i

COPY . .
RUN mkdir ./leaderboards

CMD [ "node",  "bot.js" 
