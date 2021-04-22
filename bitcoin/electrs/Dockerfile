FROM ubuntu:18.04

RUN apt-get update && apt-get install -y curl bash wget lsb-release software-properties-common && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > /rust-install.sh
RUN sh /rust-install.sh -y
RUN rm /rust-install.sh
ENV PATH="/root/.cargo/bin:/usr/bin:${PATH}"
RUN bash -c "$(wget -O - https://apt.llvm.org/llvm.sh)"
ENV LLVM_CONFIG_PATH=/usr/bin/llvm-config-12
RUN apt-get install -y clang cmake gcc build-essential libssl-dev
WORKDIR /workdir
COPY ./electrs /workdir/electrs
WORKDIR /workdir/electrs
EXPOSE 3002
RUN cargo build --release --locked --bin electrs
CMD ./target/release/electrs --cookie 'user:password' \
	--http-addr 0.0.0.0:3002 \
	--db-dir /workdir/electrs/data \
	--daemon-rpc-addr bitcoind:18332 \
	--network 'regtest' \
	--daemon-dir /workdir/bitcoin-data/ \
	--cors '*'
