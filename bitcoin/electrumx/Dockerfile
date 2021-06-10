FROM python:3.7-alpine3.11

COPY ./bin /usr/local/bin

RUN chmod a+x /usr/local/bin/* \
  && apk add --no-cache git build-base openssl \
  && apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.11/main leveldb-dev \
  && apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing rocksdb-dev \
  && pip install aiohttp pylru plyvel websockets python-rocksdb

RUN git clone https://github.com/keep-network/electrumx

RUN cd electrumx \
  && git checkout 629a609b44af8f0e810ebc67242cc0bf5f3cd1e2 \
  && python setup.py install \
  && apk del git build-base \
  && rm -rf /tmp/*

VOLUME ["/data"]
ENV HOME /data
ENV ALLOW_ROOT 1
ENV DB_DIRECTORY /data
ENV SERVICES=tcp://:50001,ssl://:50002,ws://:50003,wss://:50004,rpc://0.0.0.0:8000
ENV SSL_CERTFILE ${DB_DIRECTORY}/electrumx.crt
ENV SSL_KEYFILE ${DB_DIRECTORY}/electrumx.key
ENV HOST ""
WORKDIR /data

EXPOSE 50001 50002 50003 50004 8000

CMD ["init"]
