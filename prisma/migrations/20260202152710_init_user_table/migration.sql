-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('local', 'google');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT,
    "description" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "authType" "AuthType" NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "status" TEXT DEFAULT 'active',
    "resetPasswordCode" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
