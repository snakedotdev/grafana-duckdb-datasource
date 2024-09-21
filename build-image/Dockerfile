FROM golang:1.21-bookworm

RUN go install github.com/magefile/mage@${MAGE_VERSION:-latest} \
    && apt update -qq \
    && apt install -y bash gcc musl-dev

RUN apt update -qq \
    && apt install -y curl libstdc++-12-dev g++ zip \
    && curl -OL https://github.com/duckdb/duckdb/releases/download/v1.1.0/duckdb_odbc-linux-aarch64.zip \
    && unzip duckdb_odbc-linux-aarch64.zip \
    && mv duckdb_odbc-linux-aarch64/libduckdb_odbc.so /lib/
