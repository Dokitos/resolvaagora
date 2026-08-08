FROM node:20-alpine AS builder

# openssl: necessário para o motor do Prisma (linux-musl-openssl-3.0.x)
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production

# openssl: necessário em runtime para o motor do Prisma
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3000
# Sincroniza o schema da base de dados com prisma/schema.prisma antes de
# arrancar — sem isto, alterações ao schema (novos modelos/campos) nunca
# chegavam à base de dados de produção, só à local (db push manual).
# Sem --accept-data-loss: se alguma alteração for destrutiva, falha alto
# em vez de apagar dados às escondidas.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main"]
