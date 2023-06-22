FROM cryptodockerhub/bitcoin-core:23.0

RUN apt-get update && apt-get install -y jq
WORKDIR /workdir
ADD ./entrypoint.sh .

CMD ["./entrypoint.sh"]
