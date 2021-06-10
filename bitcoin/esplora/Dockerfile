FROM node:14-alpine3.13 AS build

RUN apk add --update --no-cache \
    git \
    bash

WORKDIR /workdir

RUN git clone --no-checkout https://github.com/Blockstream/esplora.git

WORKDIR esplora

RUN git checkout f6da494a9a0080ae2ae13842bcf53b259e3a3360

RUN npm install

ENV CORS_ALLOW=*

ARG API_URL
ENV API_URL=$API_URL

RUN npm run dist

FROM nginx:1.17-alpine

COPY --from=build /workdir/esplora/dist /usr/share/nginx/html

EXPOSE 80

## Set `daemon off` so the nginx is run in the foreground.
CMD ["nginx", "-g", "daemon off;"]
