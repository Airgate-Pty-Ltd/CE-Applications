-- Add regulatory-baseline fields to the PostgreSQL deployment path.
ALTER TABLE "training_assignment"
ADD COLUMN "recurrenceIntervalMonths" INTEGER;

CREATE TABLE "regulatory_clause" (
    "id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "intentSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "regulatory_clause_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "learning_atom"
ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'event',
ADD COLUMN "sourceClause" TEXT,
ADD COLUMN "regulatoryClauseId" TEXT,
ADD COLUMN "contentSource" TEXT;

ALTER TABLE "learning_atom"
ADD CONSTRAINT "learning_atom_regulatoryClauseId_fkey"
FOREIGN KEY ("regulatoryClauseId") REFERENCES "regulatory_clause"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "learning_intervention"
ALTER COLUMN "eventId" DROP NOT NULL;

ALTER TABLE "learning_intervention"
ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'event';

CREATE INDEX "learning_atom_origin_idx" ON "learning_atom"("origin");
CREATE INDEX "learning_atom_regulatoryClauseId_idx" ON "learning_atom"("regulatoryClauseId");
CREATE INDEX "learning_intervention_origin_idx" ON "learning_intervention"("origin");
CREATE INDEX "regulatory_clause_framework_idx" ON "regulatory_clause"("framework");
CREATE INDEX "regulatory_clause_section_idx" ON "regulatory_clause"("section");
CREATE UNIQUE INDEX "regulatory_clause_framework_itemNumber_key"
ON "regulatory_clause"("framework", "itemNumber");
