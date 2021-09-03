#!/bin/bash

set -e

trap "docker stop bitcoind electrumx electrs && docker rm bitcoind electrumx electrs" EXIT

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

printf "${LOG_START}Starting bitcoind, electrs, and electrumX...${LOG_END}"
printf "${LOG_START}If the build step fails, try increasing the memory allocated to docker.${LOG_END}"

docker-compose -f ./bitcoin/docker-compose.yml up --build
