@echo off
cd /d "%~dp0"
echo Abrindo o Prisma Studio em http://localhost:8080
start "" http://localhost:8080
python -m http.server 8080 || py -m http.server 8080
