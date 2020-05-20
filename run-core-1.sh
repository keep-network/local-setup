#!/bin/bash

set -e

cd keep-core

# Run keep-core start script.
# Answer with ENTER twice on two initial prompts then:
# - answer `1` to choose `config.local.1.toml` config file
# - answer `2` to choose `debug` log level
printf '\n\n1\n2\n' | ./scripts/start.sh