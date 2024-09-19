FROM golang:1.21-alpine

RUN go install github.com/magefile/mage@${MAGE_VERSION:-latest} \
    && apk update \
    && apk add bash gcc musl-dev

RUN apk add curl \
    && curl -OL https://github.com/duckdb/duckdb/releases/download/v1.1.0/duckdb_odbc-linux-aarch64.zip \
    && unzip duckdb_odbc-linux-aarch64.zip \
    && mv duckdb_odbc-linux-aarch64/libduckdb_odbc.so /lib/
