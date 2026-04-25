-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_blobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "s3Path" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "blobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_blobs" ("createdAt", "filename", "id", "pageCount", "s3Path", "status", "updatedAt", "userId") SELECT "createdAt", "filename", "id", "pageCount", "s3Path", "status", "updatedAt", "userId" FROM "blobs";
DROP TABLE "blobs";
ALTER TABLE "new_blobs" RENAME TO "blobs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
