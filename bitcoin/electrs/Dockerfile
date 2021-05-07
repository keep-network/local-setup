FROM rust:alpine3.13

RUN apk add clang-dev build-base linux-headers git
RUN rustup component add rustfmt
WORKDIR /workdir
RUN git clone https://github.com/Blockstream/electrs.git
WORKDIR electrs
RUN git checkout a33e97e1a1fc63fa9c20a116bb92579bbf43b254
EXPOSE 3002
ENV RUSTFLAGS -Ctarget-feature=-crt-static
RUN cargo build --release --locked --bin electrs
CMD ./target/release/electrs --cookie 'user:password' \
	--http-addr 0.0.0.0:3002 \
	--db-dir /workdir/electrs/data \
	--daemon-rpc-addr $DAEMON_RPC_ADDR \
	--network $NETWORK \
	--daemon-dir /workdir/bitcoin-data/ \
	--cors '*'
