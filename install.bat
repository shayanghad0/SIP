@echo off
echo Cloning repository...
git clone https://github.com/shayanghad0/sip.git
cd sip
echo Fetching and switching to Kharazmi...
git checkout Kharazmi
git branch
pause