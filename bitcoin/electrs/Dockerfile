FROM rust:alpine3.13 AS electrsbuild

RUN apk add --no-cache clang-dev build-base linux-headers git
RUN rustup component add rustfmt

WORKDIR /workdir

RUN git clone --no-checkout https://github.com/Blockstream/electrs.git

WORKDIR electrs

RUN git checkout a33e97e1a1fc63fa9c20a116bb92579bbf43b254

ENV RUSTFLAGS -Ctarget-feature=-crt-static
RUN cargo build --release --locked --bin electrs

FROM alpine:3.13

RUN apk --no-cache add musl libgcc libstdc++

WORKDIR /workdir

COPY --from=electrsbuild /workdir/electrs/target/release/electrs .

EXPOSE 3002

CMD ./electrs --cookie 'user:password' \
    --http-addr 0.0.0.0:3002 \
    --db-dir /workdir/data \
    --daemon-rpc-addr $DAEMON_RPC_ADDR \
    --daemon-dir /workdir/bitcoin-data/ \
    --network $NETWORK \
    --cors '*' \
    --lightmode
