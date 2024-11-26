FROM verdaccio/verdaccio:6.0.0

USER root

# Use standard port instead of socket
ARG VERDACCIO_PORT=4873

RUN \
  verdaccio --config /verdaccio/conf/config.yaml --listen ${VERDACCIO_PORT} & \
  sleep 5 \
  && apk add curl git jq sed \
  && USER=ci \
  && TOKEN=$(curl -v \
     -H "Content-Type: application/json" \
     -X PUT \
     -d '{"name": "ci", "password": "ciuserpassword", "email": "ci@example.com"}' \
     "http://localhost:${VERDACCIO_PORT}/-/user/org.couchdb.user:ci" | jq -r '.token') \
  && echo "registry=http://localhost:${VERDACCIO_PORT}" > ~/.npmrc \
  && echo "//localhost:${VERDACCIO_PORT}/:_authToken=${TOKEN}" >> ~/.npmrc \
  && mkdir -p grafana \
  && cd grafana \
  && git init \
  && git remote add origin https://github.com/grafana/grafana.git \
  && git fetch --depth 1 origin fbad76007d88490d04b1bcf087ffaa0cd0c04a23 \
  && git checkout FETCH_HEAD \
  && cd packages/grafana-data && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd - \
  && cd packages/grafana-ui && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd - \
  && cd packages/grafana-e2e-selectors && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd - \
  && cd packages/grafana-runtime && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd - \
  && cd packages/grafana-schema && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd - \
  && cd packages/grafana-sql && sed -i'' 's/"private".*,//g' package.json && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd - \
  && ls -lha \
  && ps -ef \
  && sleep 15

USER 10001


# npm error errno ENOTFOUND
# npm error network request to http://unix/tmp/verdaccio.sock:/-/registry/-/v1/login failed, reason: getaddrinfo ENOTFOUND unix
# npm error network This is a problem related to network connectivity.
# npm error network In most cases you are behind a proxy or have bad network settings.

