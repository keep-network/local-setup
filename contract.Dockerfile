FROM ethereum/client-go:stable AS deploy

WORKDIR /root

COPY ethereum/genesis/genesis.json /root/genesis.json
RUN geth init genesis.json

COPY ethereum/data/keystore /root/.ethereum/keystore
COPY ethereum/run-geth.sh /root/run-geth.sh

RUN /bin/sh -c 'echo "password" > /root/ethereum-password'

RUN apk add --update --no-cache \
  bash \
  git \
  g++ \
  python3 \
  make \
  nodejs \
  npm && \
  rm -rf /var/cache/apk/ && mkdir /var/cache/apk/ && \
  rm -rf /usr/share/man

WORKDIR /root/solidity

COPY keep-core/solidity/package.json /root/solidity/package.json
COPY keep-core/solidity/package-lock.json /root/solidity/package-lock.json

RUN npm install

ENV KEEP_ETHEREUM_PASSWORD password

COPY keep-core/solidity /root/solidity

RUN pwd
RUN ls /root/solidity/contracts

RUN nohup bash -c "/root/run-geth.sh &" && \
  sleep 2 && \
  npx truffle exec scripts/unlock-eth-accounts.js --network local && \
  npx truffle migrate --reset --network local && \
  npx truffle exec scripts/delegate-tokens.js --network local

# Similarly deploy keep-ecdsa, tbtc

# Three named layers pulled from that:
#  - tbtc-dapp (copying contract packages from deploy, with tbtc.js handled within)
#  - keep-dashboard (copying contract packages from deploy)

ENTRYPOINT [ \
  "geth", "--networkid", "1101", \
  "--unlock", "0x3d373d872b7ba29d92ed47caa8605b4dd6ec84ef", \
  "--password", "/root/ethereum-password", \
  "--allow-insecure-unlock", \
  "--miner.etherbase=0x3d373d872b7ba29d92ed47caa8605b4dd6ec84ef", \
  "--mine", "--miner.threads=1", \
  "--wsorigins", "*", "--rpccorsdomain", "*" \
  ]

#"--rpcapi", "miner,admin,eth,net,web3,personal,debug",
#"--wsapi", "miner,admin,eth,net,web3,personal,debug"
