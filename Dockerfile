FROM node:17.9.0-alpine
WORKDIR /satellite-messaging
COPY package.json yarn.lock ./
RUN npx yarn@1.22.4 install
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD npx --no-install serve -s
