@echo off

SET BASEDIR=%~dp0
SET EXECUTABLE=%BASEDIR%internal\run.bat

REM stop Orqueio Run
call "%EXECUTABLE%" stop