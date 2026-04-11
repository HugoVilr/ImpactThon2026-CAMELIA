FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias y pipenv
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    pip install pipenv && \
    rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias
COPY Pipfile Pipfile.lock ./

# Instalar los paquetes del proyecto a nivel de sistema para el contenedor
RUN pipenv install --system --deploy --clear

# Copiar el código fuente de la aplicación
COPY app/ ./app/

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT