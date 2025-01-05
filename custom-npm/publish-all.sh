#!/bin/sh

# key variable inputs
COMMIT_HASH=${1:-"fbad76007d88490d04b1bcf087ffaa0cd0c04a23"}

ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then 
    export VERDACCIO_PORT=4874; 
else 
    export VERDACCIO_PORT=4873; 
fi

echo "GOT PORT ${VERDACCIO_PORT}"

# set up npm
USER=ci
TOKEN=$(curl -v \
       -H "Content-Type: application/json" \
       -X PUT \
       -d '{"name": "ci", "password": "ciuserpassword", "email": "ci@example.com"}' \
       "http://localhost:${VERDACCIO_PORT}/-/user/org.couchdb.user:ci" | jq -r '.token')

echo "registry=http://localhost:${VERDACCIO_PORT}" > ~/.npmrc
echo "//localhost:${VERDACCIO_PORT}/:_authToken=${TOKEN}" >> ~/.npmrc

# set up grafana clone
mkdir -p grafana
cd grafana

# git setup
git init
git remote add origin https://github.com/grafana/grafana.git
git fetch --depth 1 origin ${COMMIT_HASH}
git checkout FETCH_HEAD

# publish the things...
cd packages/grafana-data && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd -

cd packages/grafana-ui && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd -

cd packages/grafana-e2e-selectors && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd -

cd packages/grafana-runtime && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd -

cd packages/grafana-schema && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd -

cd packages/grafana-sql && sed -i'' 's/"private".*,//g' package.json && npm publish --registry http://localhost:${VERDACCIO_PORT} && cd -
    