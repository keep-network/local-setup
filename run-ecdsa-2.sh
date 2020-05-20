#!/bin/bash

set -e

cd keep-ecdsa

# Run keep-ecdsa start script.
# Answer with ENTER twice on two initial prompts then:
# - answer `2` to choose `config.local.2.toml` config file
# - answer `2` to choose `debug` log level
printf '\n\n2\n2\n' | ./scripts/start.sh