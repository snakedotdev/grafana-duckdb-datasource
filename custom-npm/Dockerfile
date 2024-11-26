FROM verdaccio/verdaccio:6.0.0

USER root

# Use standard port instead of socket
ARG VERDACCIO_PORT=4873

COPY publish-all.sh /publish-all.sh

RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then export VERDACCIO_PORT=4874; else export VERDACCIO_PORT=4873; fi \
    && verdaccio --config /verdaccio/conf/config.yaml --listen ${VERDACCIO_PORT} & \
    sleep 5 \
    && apk add curl git jq sed \
    && /publish-all.sh \
    && ls -lha \
    && ps -ef \
    && sleep 15 \
    && rm -f /publish-all.sh
