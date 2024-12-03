FROM golang:1.23-bookworm

RUN go install github.com/magefile/mage@${MAGE_VERSION:-latest} \
    && go install github.com/air-verse/air@latest \
    && apt update -qq \
    && apt install -y bash gcc musl-dev

ARG DUCKDB_VERSION=1.1.0

RUN apt update -qq \
    && apt install -y curl libstdc++-12-dev g++ zip \
    && curl -OL https://github.com/duckdb/duckdb/releases/download/v${DUCKDB_VERSION}/duckdb_odbc-linux-aarch64.zip \
    && unzip duckdb_odbc-linux-aarch64.zip \
    && mv libduckdb_odbc.so /lib/
    # && mv duckdb_odbc-linux-aarch64/libduckdb_odbc.so /lib/ # this was the case for v1.1.0
