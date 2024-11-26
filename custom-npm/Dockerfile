FROM verdaccio/verdaccio:6.0.0

USER root

# Remove architecture-specific port handling since we'll use a socket
ARG VERDACCIO_SOCKET=/tmp/verdaccio.sock

RUN \
  verdaccio --config /verdaccio/conf/config.yaml --listen unix:${VERDACCIO_SOCKET} & \
  sleep 5 \
  && apk add curl git jq sed \
  && USER=ci \
  && TOKEN=$(curl -v --unix-socket ${VERDACCIO_SOCKET} \
     -H "Content-Type: application/json" \
     -X PUT \
     -d '{"name": "ci", "password": "ciuserpassword", "email": "ci@example.com"}' \
     "http://localhost/-/user/org.couchdb.user:ci" | jq -r '.token') \
  && echo "registry=http+unix://${VERDACCIO_SOCKET}" > ~/.npmrc \
  && echo "http+unix://${VERDACCIO_SOCKET}:_authToken=${TOKEN}" >> ~/.npmrc \
  && mkdir -p grafana \
  && cd grafana \
  && git init \
  && git remote add origin https://github.com/grafana/grafana.git \
  && git fetch --depth 1 origin fbad76007d88490d04b1bcf087ffaa0cd0c04a23 \
  && git checkout FETCH_HEAD \
  && cd packages/grafana-data && npm publish --registry http+unix://${VERDACCIO_SOCKET} && cd - \
  && cd packages/grafana-ui && npm publish --registry http://unix:${VERDACCIO_SOCKET}:/-/registry && cd - \
  && cd packages/grafana-e2e-selectors && npm publish --registry http://unix:${VERDACCIO_SOCKET}:/-/registry && cd - \
  && cd packages/grafana-runtime && npm publish --registry http://unix:${VERDACCIO_SOCKET}:/-/registry && cd - \
  && cd packages/grafana-schema && npm publish --registry http://unix:${VERDACCIO_SOCKET}:/-/registry && cd - \
  && cd packages/grafana-sql && sed -i'' 's/"private".*,//g' package.json && npm publish --registry http://unix:${VERDACCIO_SOCKET}:/-/registry && cd - \
  && ls -lha \
  && ps -ef \
  && sleep 15
#   && npm install -g npm-cli-adduser \
#   && npm-cli-adduser --registry http://localhost:4873 --username custom --password custom13145@bv --email custom@benetist.com \
#   && ls -lha \
#   && ps -ef \

USER 10001


# npm error errno ENOTFOUND
# npm error network request to http://unix/tmp/verdaccio.sock:/-/registry/-/v1/login failed, reason: getaddrinfo ENOTFOUND unix
# npm error network This is a problem related to network connectivity.
# npm error network In most cases you are behind a proxy or have bad network settings.

