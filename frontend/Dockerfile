# Fase 1: Construcción (Build)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Fase 2: Servidor (Nginx)
FROM nginx:stable-alpine
# Copiamos los archivos compilados a la carpeta de Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Configuración para que React Router funcione bien
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]