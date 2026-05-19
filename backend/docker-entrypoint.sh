#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] waiting for database and applying migrations if needed"

ATTEMPTS=0
MAX_ATTEMPTS=60
SLEEP=2

# Try to run migrations until success or max attempts reached
until npx prisma migrate deploy; do
  ATTEMPTS=$((ATTEMPTS+1))
  echo "[entrypoint] prisma migrate deploy failed, retrying ($ATTEMPTS/$MAX_ATTEMPTS)..."
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] reached max attempts for migrations, continuing to start (may fail)"
    break
  fi
  sleep $SLEEP
done

echo "[entrypoint] running prisma db seed (best-effort)"
echo "[entrypoint] ensure schema with prisma db push (best-effort)"
if ! npx prisma db push --accept-data-loss; then
  echo "[entrypoint] prisma db push failed; continuing"
fi

if ! npx prisma db seed; then
  echo "[entrypoint] prisma db seed failed or already applied; continuing"
fi

echo "[entrypoint] launching application"
exec "$@"
