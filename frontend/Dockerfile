# ---- Dependencias ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps --no-fund --no-update-notifier

# ---- Build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno baked en el build (Next.js NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_PARSE_APP_ID
ARG NEXT_PUBLIC_PARSE_JS_KEY
ARG NEXT_PUBLIC_PARSE_SERVER_URL=/api/parse
ENV NEXT_PUBLIC_PARSE_APP_ID=$NEXT_PUBLIC_PARSE_APP_ID
ENV NEXT_PUBLIC_PARSE_JS_KEY=$NEXT_PUBLIC_PARSE_JS_KEY
ENV NEXT_PUBLIC_PARSE_SERVER_URL=$NEXT_PUBLIC_PARSE_SERVER_URL

RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar artefactos standalone de Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
