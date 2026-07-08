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
# Aplica migrações pendentes antes de arrancar. `prisma` está em dependencies,
# por isso está presente na imagem de produção. Se a migração falhar, o
# contentor não arranca (o schema tem de estar sincronizado com o código).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
