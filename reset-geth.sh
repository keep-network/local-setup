#!/bin/bash

SCRIPT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DATA_DIR="$SCRIPT_PATH/docker/geth/.data"
rm -rf $DATA_DIR
git checkout $DATA_DIR
