FROM node:20.1.0-alpine3.17 as build

RUN apk add --update --no-cache git bash

WORKDIR /workdir

RUN git clone --no-checkout https://github.com/Blockstream/esplora.git

WORKDIR esplora

RUN git checkout 947e4b7bbc79fe359c6e5eb0661e0a7be75bc6a9

RUN npm install

ENV CORS_ALLOW="*"
ENV FLAVOR="bitcoin-regtest"
ENV BASE_HREF="/"

ARG API_URL
ENV API_URL=$API_URL

RUN npm run dist $FLAVOR

FROM nginx:1.24.0

COPY --from=build /workdir/esplora/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d

## Set `daemon off` so the nginx is run in the foreground.
CMD ["nginx", "-g", "daemon off;"]
