#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m'      # new line + reset color

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule update --init --recursive --remote --rebase --force
cd coverage-pools
git checkout 1d2133eeb544db6c316f7879a6927d05d114929d
printf "${LOG_START}Coverage-pools switched to 1d2133eeb544db6c316f7879a6927d05d114929d${LOG_END}"