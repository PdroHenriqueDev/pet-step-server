FROM node:18

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn cache clean

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 3000

CMD ["node", "dist/index.js"]
