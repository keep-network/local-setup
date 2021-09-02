#!/bin/bash

set -e

LOG_START='\n\e[1;36m'  # new line + bold + color
LOG_END='\n\e[0m'       # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Installing bitcoind-wallet...${LOG_END}"

npm install -g "$WORKDIR/bitcoind-wallet"

printf "${LOG_START}Cleaning up data directory...${LOG_END}"

rm -rf $PWD/bitcoin/.data

printf "${LOG_START}Building bitcoind, electrs, and electrumX...${LOG_END}"
printf "${LOG_START}If the build step fails, try increasing the memory allocated to docker.${LOG_END}"

docker-compose -f ./bitcoin/docker-compose.yml build

printf "${LOG_START}Bitcoin initialization complete!${LOG_END}"
