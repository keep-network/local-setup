#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule update --init --recursive --remote --rebase --force

cd keep-ecdsa
git checkout redemption-actions
cd ..

cd tbtc
git checkout tbtc-system-filterer
cd ..