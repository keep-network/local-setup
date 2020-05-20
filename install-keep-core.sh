#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting keep-core deployment...${LOG_END}"

printf "${LOG_START}Copying config files...${LOG_END}"

# Copy all config files to the right keep-core directory.
cp -R configs/keep-core/. keep-core/configs/

cd keep-core/configs

# Fill absolute paths in config file with actual working directory.
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.1.toml
rm *.OLD

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

# Create storage directory for keep-core client.
mkdir -p storage/keep-core/1

printf "${LOG_START}Running install script...${LOG_END}"

cd keep-core

# Run keep-core install script. Answer with ENTER twice on emerging prompts.
printf '\n\n' | ./scripts/install.sh

printf "${DONE_START}keep-core deployed successfully!${DONE_END}"