#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

WORKDIR=$PWD

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule init
git submodule update

printf "${LOG_START}Starting keep-core deployment...${LOG_END}"

printf "${LOG_START}Copying config files...${LOG_END}"

cp -R configs/keep-core/. keep-core/configs/

cd keep-core/configs

sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.1.toml
rm *.OLD

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

mkdir -p "$WORKDIR/storage/keep-core/1"
mkdir -p "$WORKDIR/storage/keep-core/2"

printf "${LOG_START}Running install script...${LOG_END}"

cd keep-core

./scripts/install.sh

printf "${LOG_START}keep-core deployed successfully!${LOG_END}"

cd $WORKDIR

