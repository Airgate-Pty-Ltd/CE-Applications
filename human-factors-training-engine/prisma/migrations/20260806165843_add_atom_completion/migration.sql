-- CreateTable
CREATE TABLE "atom_completion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "atom_completion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "atom_completion_assignmentId_idx" ON "atom_completion"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "atom_completion_assignmentId_atomId_key" ON "atom_completion"("assignmentId", "atomId");
