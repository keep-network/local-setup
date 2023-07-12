FROM rust:1.69-alpine3.17 AS electrsbuild

RUN apk add --no-cache clang-dev build-base linux-headers git
RUN rustup component add rustfmt
WORKDIR /workdir
RUN git clone --no-checkout https://github.com/Blockstream/electrs.git
WORKDIR electrs
# Use the most recent commit from `202305-fix-mempool-batching`.
# This is the most recently worked on stable branch.
RUN git checkout 20e42862a57f0d45ce48a9956a361e7193b9e97d
ENV RUSTFLAGS -Ctarget-feature=-crt-static
RUN cargo build --release --locked --bin electrs

FROM alpine:3.17

RUN apk --no-cache add musl libgcc libstdc++

WORKDIR /workdir

COPY --from=electrsbuild /workdir/electrs/target/release/electrs .

CMD ./electrs --cookie 'user:password' \
  --http-addr 0.0.0.0:3002 \
  --db-dir /workdir/data \
  --daemon-rpc-addr $DAEMON_RPC_ADDR \
  --daemon-dir /workdir/bitcoin-data/ \
  --network $NETWORK \
  --cors '*' \
  --lightmode
