FROM node:14.3.0-alpine3.11

ENV TBTCJS_VERSION 0.18.0-rc.2

RUN apk add --no-cache \
    jq \
    git \
    python3 \
    build-base

WORKDIR /e2e

COPY . .

RUN jq '.dependencies."@keep-network/tbtc.js" = env.TBTCJS_VERSION' \
    package.json > package.json.tmp && mv package.json.tmp package.json

RUN npm install

ENTRYPOINT ["node", "--experimental-json-modules", "e2e-test.js"]

CMD []
