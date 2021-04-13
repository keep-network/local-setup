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

cd "$WORKDIR/keep-core/configs"

# Fill absolute paths in config file with actual working directory.
TMP_FILE=$(mktemp /tmp/config.local.1.toml.XXXXXXXXXX)
sed 's:WORKDIR:'$WORKDIR':' config.local.1.toml > $TMP_FILE
mv $TMP_FILE config.local.1.toml

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd "$WORKDIR"

# Create storage directory for keep-core client.
mkdir -p storage/keep-core/1

printf "${LOG_START}Running install script...${LOG_END}"

cd "$WORKDIR/keep-core"

# Run keep-core install script. Answer with ENTER twice on emerging prompts.
printf '\n\n' | ./scripts/install.sh

printf "${LOG_START}Preparing keep-core artifacts...${LOG_END}"

cd "$WORKDIR/keep-core/solidity"

ln -sf build/contracts artifacts

printf "${DONE_START}keep-core deployed successfully!${DONE_END}"
