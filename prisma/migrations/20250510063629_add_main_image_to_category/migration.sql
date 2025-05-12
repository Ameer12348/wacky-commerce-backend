/*
  Warnings:

  - Added the required column `mainImage` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `category` ADD COLUMN `mainImage` VARCHAR(191) NOT NULL;
