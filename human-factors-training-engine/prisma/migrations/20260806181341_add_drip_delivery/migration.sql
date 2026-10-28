-- CreateTable
CREATE TABLE "drip_delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drip_delivery_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "drip_delivery_assignmentId_atomId_idx" ON "drip_delivery"("assignmentId", "atomId");
