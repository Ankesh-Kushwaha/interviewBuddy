FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm i

COPY . .

EXPOSE 8081

CMD ["node", "src/wsserver.js"]
