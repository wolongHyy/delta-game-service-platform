@echo off
setlocal EnableExtensions
title Delta Game Service - 三角洲游戏服务平台
cd /d "%~dp0"

echo ========================================
echo   三角洲游戏服务平台 - 启动器
echo ========================================
echo.

set "NODE_EXE=%~dp0node\node.exe"
if exist "%NODE_EXE%" goto node_ready
set "NODE_EXE=node"
goto node_check

:node_ready
echo [1/5] 运行环境: 便携版 Node.js
goto setup_env

:node_check
where node >nul 2>nul
if errorlevel 1 goto no_node
echo [1/5] 运行环境: 系统 Node.js
goto setup_env

:no_node
echo [错误] 未找到可用的 Node.js 运行环境。
echo.
echo 请任选其一后重新双击 start.bat：
echo    1. 使用完整发布的便携包（应自带 node\node.exe）
echo    2. 安装 Node.js 22 或更高版本：https://nodejs.org
echo.
pause
exit /b 1

:setup_env
"%NODE_EXE%" --version
cd /d "%~dp0app"

if not exist ".env" if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [2/5] 已由 .env.example 生成 .env
) else (
    echo [2/5] 配置文件 .env 已存在
)

if not exist "node_modules" goto install_deps
echo [3/5] 依赖已就绪
goto build_check

:install_deps
echo [3/5] 首次运行：安装依赖，约 1-3 分钟，请勿关闭窗口...
where npm >nul 2>nul
if errorlevel 1 goto install_via_node
call npm install --no-audit --no-fund
if errorlevel 1 goto install_failed
goto build_check

:install_via_node
call "%NODE_EXE%" "%~dp0node\node_modules\npm\bin\npm-cli.js" install --no-audit --no-fund
if errorlevel 1 goto install_failed
goto build_check

:install_failed
echo.
echo [错误] 依赖安装失败，请检查网络后重试。
pause
exit /b 1

:build_check
if not exist ".next\BUILD_ID" goto do_build
echo [4/5] 编译产物已就绪
goto start_server

:do_build
echo [4/5] 首次运行：编译前端，约 2-5 分钟，请勿关闭窗口...
call "%NODE_EXE%" --experimental-sqlite node_modules\next\dist\bin\next build --webpack
if errorlevel 1 goto build_failed
call "%NODE_EXE%" scripts\postbuild.cjs
goto start_server

:build_failed
echo.
echo [错误] 编译失败，请将本窗口截图发给技术支持。
pause
exit /b 1

:start_server
if not exist "db" mkdir "db"
echo [5/5] 正在启动服务...
echo.
echo ========================================
echo   启动成功后请在浏览器打开:
echo     http://localhost:3000
echo   管理后台: http://localhost:3000/admin
echo.
echo   关闭此窗口即可停止服务
echo ========================================
echo.
"%NODE_EXE%" --experimental-sqlite server.js
echo.
echo ========================================
echo   服务已停止。如出现错误请截图反馈。
echo ========================================
pause