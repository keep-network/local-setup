FROM ubuntu:23.10

# Install dependencies
RUN apt-get update && apt-get install -y \
  autoconf \
  automake \
  autotools-dev \
  bc \
  bsdmainutils \
  build-essential \
  git \
  jq \
  libboost-all-dev \
  libevent-dev \
  libsqlite3-dev \
  libtool \
  libzmq5-dev \
  pkg-config \
  python3

# Clone bitcoin source code
RUN git clone https://github.com/bitcoin/bitcoin.git

WORKDIR /bitcoin

# Switch to the latest stable branch
RUN git checkout $(git tag | sort -V | tail -n 1)

# Build BerkeleyDB
RUN ./autogen.sh
RUN ./configure --with-gui=no --disable-tests --disable-bench --without-miniupnpc --enable-upnp-default
RUN make

COPY ./create-env.sh /src/create-env.sh

CMD /src/create-env.sh
