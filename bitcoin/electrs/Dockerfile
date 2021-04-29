FROM rust:alpine3.13

RUN apk add clang-dev build-base linux-headers
RUN rustup component add rustfmt
COPY ./electrs /workdir/electrs
WORKDIR /workdir/electrs
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
