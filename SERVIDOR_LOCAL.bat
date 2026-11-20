@echo off
REM Faunopolis - servidor local opcional (requer Python 3)
cd /d "%~dp0"
where python >/dev/null 2>/dev/null || (echo Python nao encontrado. Abra o index.html diretamente ou instale o Python 3. & pause & exit /b)
echo Iniciando servidor em http://localhost:8080 ... feche esta janela para parar.
start "" "http://localhost:8080"
python -m http.server 8080
