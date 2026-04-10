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

### 1) Instalar dependencias del frontend

Desde la raíz del repo:

```bash
npm install
```

### 2) Configurar backend con Pipenv

```bash
cd backend
pipenv --python 3.11
pipenv install --dev
pipenv lock
```

Si tu sistema no tiene Python 3.11 disponible:

```bash
cd backend
pipenv --python "$(which python)"
pipenv install --dev
pipenv lock
```

### 3) Variables de entorno (opcional, recomendado)

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

## Ejecución

### Base de datos

Desde la raíz:

```bash
docker compose up -d
```

PostgreSQL quedará disponible en `localhost:5432`.

### Backend

```bash
cd backend
cp .env.example .env
pipenv run start
```

API por defecto: `http://localhost:8000`

### Frontend

En otra terminal, desde la raíz:

```bash
npm run dev:frontend
```

App por defecto: `http://localhost:5173`

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
