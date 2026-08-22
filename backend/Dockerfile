FROM node:22-alpine

# Crear usuario no-root para mayor seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S parseuser -u 1001

WORKDIR /parse-server

# Crear directorio para archivos persistentes
RUN mkdir -p /parse-server/files/uploads && chown -R parseuser:nodejs /parse-server

# Copiar archivos de configuración de dependencias con ownership correcto
COPY --chown=parseuser:nodejs package.json ./

# Instalar dependencias como parseuser
USER parseuser
RUN npm install --production --silent

# Copiar el resto de la aplicación con ownership correcto
COPY --chown=parseuser:nodejs . .

EXPOSE 1337

CMD ["npm", "start"]
