FROM node:alpine
RUN npm i -g @swarthy/wait-for@2.0.1
VOLUME /app
WORKDIR /app
USER node
