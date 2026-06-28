@echo off
chcp 65001 >nul
echo.
echo 线束车间资料管控平板演示启动
echo ==================================
echo 1. 请确认电脑和平板在同一 WiFi 或同一网段。
echo 2. 如浏览器无法访问，请允许 Windows 防火墙中的 Node.js。
echo 3. 终端会显示平板访问地址。
echo 4. 本脚本不连接数据库，不执行写库操作。
echo.
npm run dev:lan
pause
