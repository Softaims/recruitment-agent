/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add password column with a temporary default value for existing users
ALTER TABLE "public"."users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$defaulthashedpassword';

-- Update existing users with a proper hashed password (change this in production)
UPDATE "public"."users" SET "password" = '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjPFmcxLzaFJX9ajgzMBzC4WrAuJ2u' WHERE "password" = '$2b$10$defaulthashedpassword';

-- Remove the default value
ALTER TABLE "public"."users" ALTER COLUMN "password" DROP DEFAULT;
