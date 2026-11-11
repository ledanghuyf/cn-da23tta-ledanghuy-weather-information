@echo off
title Thoi tiet - Du bao moi ngay
cd /d "%~dp0"
echo THOI TIET - DU BAO MOI NGAY
echo Dang chon cong trong va mo trinh duyet...
echo Can Internet de lay du lieu. Giu cua so nay mo khi su dung.
where node >nul 2>&1
if not errorlevel 1 (
  node scripts\serve.cjs --open
  goto finished
)
where py >nul 2>&1
if not errorlevel 1 (
  py -3 scripts\serve.py --open
  goto finished
)
where python >nul 2>&1
if not errorlevel 1 (
  python scripts\serve.py --open
  goto finished
)
echo Chua co Node.js hoac Python. Hay cai Node.js LTS roi mo lai tep nay.
:finished
pause
