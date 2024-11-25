FROM verdaccio/verdaccio:6.0.0

USER root

RUN verdaccio --config /verdaccio/conf/config.yaml --listen $VERDACCIO_PROTOCOL://0.0.0.0:$VERDACCIO_PORT & \
  sleep 5 \
  && apk add curl git jq sed \
  # && curl -XPUT -H 'content-type: application/json' -d '{"name": "ci", "password": "ciuserpassword"}' 'http://localhost:4873/-/user/org.couchdb.user:ci' \
  && USER=ci \
  && TOKEN=`curl -XPUT -H 'content-type: application/json' -d "{\"name\": \"$USER\", \"password\": \"ciuserpassword\"}" "http://localhost:4873/-/user/org.couchdb.user:$USER" | jq -r '.token'` \
  && echo "//localhost:4873/:_authToken=\"$TOKEN\"" > .npmrc \
  && mkdir -p grafana \
  && cd grafana \
  && git init \
  && git remote add origin https://github.com/grafana/grafana.git \
  && git fetch --depth 1 origin fbad76007d88490d04b1bcf087ffaa0cd0c04a23 \
  && git checkout FETCH_HEAD \
  && cd packages/grafana-data && npm publish --registry http://localhost:4873 && cd - \
  && cd packages/grafana-ui && npm publish --registry http://localhost:4873 && cd - \
  && cd packages/grafana-e2e-selectors && npm publish --registry http://localhost:4873 && cd - \
  && cd packages/grafana-runtime && npm publish --registry http://localhost:4873 && cd - \
  && cd packages/grafana-schema && npm publish --registry http://localhost:4873 && cd - \
  && cd packages/grafana-sql && sed -i'' 's/"private".*,//g' package.json && npm publish --registry http://localhost:4873 && cd - \
  && ls -lha \
  && ps -ef \
  && sleep 15
#   && npm install -g npm-cli-adduser \
#   && npm-cli-adduser --registry http://localhost:4873 --username custom --password custom13145@bv --email custom@benetist.com \
#   && ls -lha \
#   && ps -ef \

USER 10001
