@echo off
setlocal
chcp 65001 > nul
title 超画像魂コンバイン Web Studio 起動ランチャー

:: デフォルトのフォルダパスをバッチファイルのある場所に確実に固定
cd /d "%~dp0"

cls

echo ================================================================================
echo ✨ 超画像魂コンバイン Web Studio v2.1 (Local Zero-Install)
echo 🤖 Generated & Crafted with: Google Gemini
echo ================================================================================
echo.
echo 📁 作業基準フォルダ (デフォルトパス): %CD%
echo.
echo [1/2] ローカル超軽量HTTPサーバーを起動しています (Port: 8089)...
start /b python -m http.server 8089 --directory "%CD%" > nul 2>&1

timeout /t 1 > nul

echo [2/2] お使いのブラウザで Web Studio を開いています...
start http://localhost:8089/index.html

echo.
echo ✨ 起動完了！ブラウザで自由にお楽しみください！(๑•̀ㅂ•́)و✧
echo.
echo --------------------------------------------------------------------------------
echo [O] このフォルダをエクスプローラーで開く
echo [Q] ローカルサーバーを終了して閉じる
echo --------------------------------------------------------------------------------

:loop
set "choice="
set /p choice="操作を入力してください [O: フォルダを開く / Q: 終了]: "
if /i "%choice%"=="O" (
    explorer "%CD%"
    goto loop
)
if /i "%choice%"=="Q" (
    goto end
)
goto loop

:end
exit
