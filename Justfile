build-image:
  docker build -t build-image ./build-image

backend:
  mage -v build:linuxARM64

backend-docker:
  docker run --rm -e MAGEFILE_DEBUG=true -e GOOS=linux -e CGO_ENABLED=1 -v "$PWD":/usr/src/app -w /usr/src/app build-image mage aarch64

backend-docker-coverage:
  docker run --rm -e MAGEFILE_DEBUG=true -e GOOS=linux -e CGO_ENABLED=1 -v "$PWD":/usr/src/app -w /usr/src/app build-image mage coverage

backend-docker-air:
  docker run --rm -e MAGEFILE_DEBUG=true -e GOOS=linux -e CGO_ENABLED=1 -it -v "$PWD":/usr/src/app -w /usr/src/app build-image air -c .air.toml

frontend:
  npm run dev

server:
  npm run server

compose:
  docker compose up -d

logs:
  docker compose logs -f

compose-down: 
  docker compose down

e2e-up:
  docker compose -f docker-compose.test.yml up -d
e2e-down:
  docker compose -f docker-compose.test.yml down
  
prod-up:
  docker compose -f docker-compose.prod.yaml up -d
prod-build:
  docker compose -f docker-compose.prod.yaml build
prod-down:
  docker compose -f docker-compose.prod.yaml down

e2e: 
  npx playwright test -c e2e/config/test.config.ts
e2e-debug: 
  npx playwright test -c e2e/config/test.config.ts --debug --headed
