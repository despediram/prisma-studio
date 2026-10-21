#!/bin/sh
cd "$(dirname "$0")"
echo "Prisma Studio em http://localhost:8080"
(command -v xdg-open >/dev/null && xdg-open http://localhost:8080 || open http://localhost:8080) >/dev/null 2>&1 &
python3 -m http.server 8080
