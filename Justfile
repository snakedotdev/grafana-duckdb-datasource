backend:
  mage -v build:linuxARM64

frontend:
  npm run dev

compose:
  docker compose up
