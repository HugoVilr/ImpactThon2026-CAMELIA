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

## Tests

### Frontend

Desde la raíz del monorepo:

```bash
npm run test --workspace frontend
```

Modo watch en frontend:

```bash
npm run test:watch --workspace frontend
```

Build de validación frontend:

```bash
npm run build --workspace frontend
```

### Backend

Desde `backend/`:

```bash
pipenv run test
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

## Deploy frontend en Google Cloud Run (contenedor Docker)

Prerequisitos:

- `gcloud` instalado y autenticado (`gcloud auth login`)
- Proyecto de GCP con billing activo
- Docker funcionando en local

Desde la raíz del repo:

```bash
PROJECT_ID="tu-project-id"
REGION="europe-southwest1"
SERVICE="camelia-frontend"
REPO="camelia-containers"
VITE_API_URL="https://api-mock-cesga.onrender.com"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:$(date +%Y%m%d-%H%M%S)"
```

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION" || true
gcloud auth configure-docker "$REGION-docker.pkg.dev"
```

```bash
docker build --platform linux/amd64 \
  -f frontend/Dockerfile \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  -t "$IMAGE" \
  frontend

docker push "$IMAGE"
```

```bash
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 80
```

Obtener la URL publicada:

```bash
gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)'
```

Nota: `VITE_API_URL` se inyecta en build (Vite). Si cambia la API, hay que reconstruir y redeployar la imagen.

## CI/CD con GitHub Actions (develop)

Workflow: `.github/workflows/ci.yml`

- `pull_request` a `develop`: ejecuta tests de frontend y backend.
- `push` a `develop`: ejecuta tests y, si pasan, despliega frontend a Cloud Run.

### Secrets requeridos en GitHub

Configúralos en `Settings > Secrets and variables > Actions`:

- `GCP_PROJECT_ID` (ej: `impactthon2026`)
- `GCP_REGION` (ej: `europe-southwest1`)
- `GCP_FRONTEND_SERVICE` (ej: `camelia-frontend`)
- `GCP_ARTIFACT_REPOSITORY` (ej: `camelia-containers`)
- `GCP_SA_KEY` (JSON de Service Account con permisos para Artifact Registry y Cloud Run)

### Variables opcionales en GitHub

- `FRONTEND_VITE_API_URL`: si la defines, se usa como `VITE_API_URL` durante el build.
  Si no existe, el `Dockerfile` usa su valor por defecto.
