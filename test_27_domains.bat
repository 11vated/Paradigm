@echo off
REM Test all 27 domains via API
echo Testing Paradigm Absolute 27 Domains...
echo.

REM Test Character
echo [1/27] Testing character...
curl -s -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"character\",\"name\":\"Test Character\",\"genes\":{\"size\":{\"type\":\"scalar\",\"value\":0.7}}}" > temp_seed.json
set /p SEED_ID=<temp_seed.json
curl -s -X POST http://localhost:3000/api/seeds/%SEED_ID%/grow -H "Content-Type: application/json" -d "{}" > result_character.json
echo Character: DONE

REM Test Sprite
echo [2/27] Testing sprite...
curl -s -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"sprite\",\"name\":\"Test Sprite\",\"genes\":{\"resolution\":{\"type\":\"scalar\",\"value\":0.8}}}" > temp_seed.json
curl -s -X POST http://localhost:3000/api/seeds/%SEED_ID%/grow -H "Content-Type: application/json" -d "{}" > result_sprite.json
echo Sprite: DONE

REM Test Music
echo [3/27] Testing music...
curl -s -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"music\",\"name\":\"Test Music\",\"genes\":{\"tempo\":{\"type\":\"scalar\",\"value\":0.7}}}" > temp_seed.json
curl -s -X POST http://localhost:3000/api/seeds/%SEED_ID%/grow -H "Content-Type: application/json" -d "{}" > result_music.json
echo Music: DONE

REM Test Visual2D
echo [4/27] Testing visual2d...
curl -s -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"visual2d\",\"name\":\"Test Art\",\"genes\":{\"style\":{\"type\":\"categorical\",\"value\":\"fractal\"}}}" > temp_seed.json
curl -s -X POST http://localhost:3000/api/seeds/%SEED_ID%/grow -H "Content-Type: application/json" -d "{}" > result_visual2d.json
echo Visual2D: DONE

REM Test Geometry3D
echo [5/27] Testing geometry3d...
curl -s -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"geometry3d\",\"name\":\"Test Mesh\",\"genes\":{\"primitive\":{\"type\":\"categorical\",\"value\":\"sphere\"}}}" > temp_seed.json
curl -s -X POST http://localhost:3000/api/seeds/%SEED_ID%/grow -H "Content-Type: application/json" -d "{}" > result_geometry3d.json
echo Geometry3D: DONE

REM Test FullGame
echo [6/27] Testing fullgame...
curl -s -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"fullgame\",\"name\":\"Test Game\",\"genes\":{\"genre\":{\"type\":\"categorical\",\"value\":\"rpg\"}}}" > temp_seed.json
curl -s -X POST http://localhost:3000/api/seeds/%SEED_ID%/grow -H "Content-Type: application/json" -d "{}" > result_fullgame.json
echo FullGame: DONE

del temp_seed.json
echo.
echo All 6 core domains tested!
echo Check result_*.json files for outputs.
