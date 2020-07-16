#!/bin/bash

set -e

trap "docker stop bitcoind electrumx && docker rm bitcoind electrumx" EXIT

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

printf "${LOG_START}Starting bitcoind and electrumX...${LOG_END}"

docker-compose -f ./bitcoin/docker-compose.yml up