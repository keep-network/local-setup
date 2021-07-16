#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting coverage-pools deployment...${LOG_END}"

cd coverage-pools

# Run coverage-pools install script.
./scripts/install.sh

printf "${DONE_START}coverage-pools deployed successfully!${DONE_END}"