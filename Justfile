build-image:
    docker build -t build-image ./build-image

backend:
  mage -v build:linuxARM64

backend-docker:
  docker run --rm -e GOOS=linux -e GOARCH=arm64 -e CGO_ENABLED=1 -v "$PWD":/usr/src/app -w /usr/src/app build-image mage -v build:linuxARM64

frontend:
  npm run dev

server:
  npm run server

compose:
  docker compose up
