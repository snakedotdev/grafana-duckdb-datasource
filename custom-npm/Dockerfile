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

USER 10001


# npm error errno ENOTFOUND
# npm error network request to http://unix/tmp/verdaccio.sock:/-/registry/-/v1/login failed, reason: getaddrinfo ENOTFOUND unix
# npm error network This is a problem related to network connectivity.
# npm error network In most cases you are behind a proxy or have bad network settings.

