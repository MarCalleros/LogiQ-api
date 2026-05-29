CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "locals" CASCADE;
DROP TYPE IF EXISTS "UserRole";

CREATE TYPE "UserRole" AS ENUM ('ADMINISTRADOR', 'RECEPCIONISTA', 'REPARTIDOR');

CREATE TABLE "locals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "manager_name" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "locals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'RECEPCIONISTA',
  "phone" TEXT,
  "address" TEXT,
  "local_id" UUID,
  "password_hash" TEXT NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locals"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_is_deleted_idx" ON "users"("email", "is_deleted");
CREATE INDEX "users_role_is_deleted_idx" ON "users"("role", "is_deleted");
CREATE INDEX "users_local_id_idx" ON "users"("local_id");
CREATE INDEX "locals_name_is_deleted_idx" ON "locals"("name", "is_deleted");
