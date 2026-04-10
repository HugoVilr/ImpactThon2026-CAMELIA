# ImpactThon2026-CAMELIA

Monorepo base con:

- `frontend/`: React + TypeScript + Vite
- `backend/`: Python + FastAPI + Pipenv

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Uvicorn
- Gestión de entorno Python: Pipenv (`Pipfile` + `Pipfile.lock`)

## Requisitos del sistema

- Git
- Node.js 20+ y npm
- Python 3.11+ (recomendado 3.11)
- Pipenv

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

### Backend

```bash
cd backend
pipenv run start
```

API por defecto: `http://localhost:8000`

### Frontend

En otra terminal, desde la raíz:

```bash
npm run dev:frontend
```

App por defecto: `http://localhost:5173`

## Validación rápida

- Backend health: `http://localhost:8000/health`
- Frontend: `http://localhost:5173`

## Scripts útiles del backend

Desde `backend/` con Pipenv:

- `pipenv run start`
- `pipenv run test`
- `pipenv run lint`
