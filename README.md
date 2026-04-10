# ImpactThon2026-CAMELIA

Monorepo base con:

- `frontend/`: React + TypeScript + Vite
- `backend/`: Python + FastAPI + Pipenv

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Uvicorn
- Base de datos local: PostgreSQL 16 con Docker Compose
- Gestión de entorno Python: Pipenv (`Pipfile` + `Pipfile.lock`)

## Requisitos del sistema

- Git
- Node.js 20+ y npm
- Python 3.11+ (recomendado 3.11)
- Pipenv
- Docker + Docker Compose

### Arch Linux

```bash
sudo pacman -Syu --needed git nodejs npm python python-pip python-pipenv
```

### Debian/Ubuntu

```bash
sudo apt update
sudo apt install -y git nodejs npm python3 python3-pip pipenv
```

Si `pipenv` no queda disponible en el `PATH`, instala por usuario:

```bash
python3 -m pip install --user pipenv
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Estructura

```text
.
├── backend
│   ├── app
│   │   └── main.py
│   ├── .env.example
│   ├── Pipfile
│   └── Pipfile.lock
├── frontend
│   ├── src
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .gitignore
├── package.json
└── README.md
```

## Setup del proyecto

```bash
npm install
```

```bash
cd backend
pipenv --python 3.11
pipenv install --dev
pipenv lock
```

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d
```

## Frontend contra API remota (CESGA mock)

El frontend está preparado para consumir por defecto:

```text
https://api-mock-cesga.onrender.com
```

Lo controla `frontend/.env` con `VITE_API_URL`.

Si quieres apuntar al backend local de este repo, cambia:

```text
VITE_API_URL=http://localhost:8000
```

## Ejecución

```bash
cd backend
pipenv run start
```

```bash
cd ..
npm run dev:frontend
```

## Base de datos local

El backend usa PostgreSQL local con esta configuración por defecto:

```text
Host: localhost
Puerto: 5432
Base de datos: camelia
Usuario: camelia
Password: camelia
```

La API expone:

- `GET /health`: devuelve estado y referencia de conexión a PostgreSQL
- `GET /api/entries`: lista los registros
- `POST /api/entries`: crea un registro

### Abrir la base en DBeaver

1. Crear una nueva conexión `PostgreSQL`.
2. Usar host `localhost`, puerto `5432`, base `camelia`, usuario `camelia`, password `camelia`.
3. Abrir la tabla `entries` en el esquema `public`.

La tabla `entries` se crea automáticamente cuando arranca el backend.

## Validación rápida

- Backend health: `http://localhost:8000/health`
- Frontend: `http://localhost:5173`

## Scripts útiles del backend

Desde `backend/` con Pipenv:

- `pipenv run start`
- `pipenv run test`
- `pipenv run lint`
