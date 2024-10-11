build-image:
    docker build -t build-image ./build-image

backend:
  mage -v build:linuxARM64

backend-docker:
  docker run --rm -e MAGEFILE_DEBUG=true -e GOOS=linux -e CGO_ENABLED=1 -v "$PWD":/usr/src/app -w /usr/src/app build-image mage default

backend-docker-air:
  docker run --rm -e MAGEFILE_DEBUG=true -e GOOS=linux -e CGO_ENABLED=1 -it -v "$PWD":/usr/src/app -w /usr/src/app build-image air -c .air.toml

frontend:
  npm run dev

server:
  npm run server

compose:
  docker compose up
