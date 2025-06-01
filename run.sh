#!/bin/bash

cd frontend

npm install
npm run dev &

cd ..

set -e

if [ -d "orderbook_env" ]; then
    rm -rf orderbook_env
fi

python3 -m venv orderbook_env
source orderbook_env/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

python3 manage.py makemigrations
python3 manage.py migrate

python3 manage.py runserver 8000 &
daphne -p 8001 app.asgi:application &

