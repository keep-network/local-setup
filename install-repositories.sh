#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m'      # new line + reset color

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule update --init --recursive --remote --rebase --force
cd coverage-pools
git checkout 31d3af2039adc8a556e2ed125b28af4a7a16a371
printf "${LOG_START}Coverage-pools switched to 31d3af2039adc8a556e2ed125b28af4a7a16a371${LOG_END}"