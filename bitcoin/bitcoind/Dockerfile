FROM ubuntu:18.04

RUN apt-get update && apt-get install -y wget jq && rm -rf /var/lib/apt/lists/*

RUN wget -O bitcoin-core.tar.gz https://bitcoin.org/bin/bitcoin-core-0.20.0/bitcoin-0.20.0-x86_64-linux-gnu.tar.gz
RUN mkdir /bitcoin-core && tar -xzf bitcoin-core.tar.gz -C /bitcoin-core --strip-components=1
RUN cp -a /bitcoin-core/bin /workdir

ADD ./entrypoint.sh /workdir/entrypoint.sh

WORKDIR /workdir

EXPOSE 18332

CMD ["./entrypoint.sh"]
