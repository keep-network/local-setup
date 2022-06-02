#!/bin/bash

set -e

LOG_START='\n\e[1;36m'  # new line + bold + color
LOG_END='\n\e[0m'       # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting relay...${LOG_END}"

cd "$WORKDIR/relays/maintainer/"

export PYTHONPATH="$WORKDIR/relays/maintainer/"

# Run relay-maintainer.
pipenv run python maintainer/header_forwarder/h.py .my_env_file.env
