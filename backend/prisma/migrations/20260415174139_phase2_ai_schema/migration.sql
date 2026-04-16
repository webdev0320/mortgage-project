-- AlterTable
ALTER TABLE "pages" ADD COLUMN "anomalyFlags" TEXT;
ALTER TABLE "pages" ADD COLUMN "extractedData" TEXT;

-- CreateTable
CREATE TABLE "classification_corrections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blobId" TEXT NOT NULL,
    "originalAiLabel" TEXT NOT NULL,
    "finalHumanLabel" TEXT NOT NULL,
    "pageThumbnailPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
