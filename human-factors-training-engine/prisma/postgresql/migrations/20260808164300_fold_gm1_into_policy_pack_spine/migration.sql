-- Fold the temporary regulator-specific clause table into the regulator-neutral spine.
ALTER TABLE "policy_pack" ADD COLUMN "spineRevision" INTEGER;
ALTER TABLE "policy_pack_clause" ADD COLUMN "section" TEXT;
ALTER TABLE "policy_pack_clause" ADD COLUMN "sectionLabel" TEXT;

ALTER TABLE "learning_atom" DROP CONSTRAINT "learning_atom_regulatoryClauseId_fkey";
DROP INDEX "learning_atom_regulatoryClauseId_idx";
ALTER TABLE "learning_atom" DROP COLUMN "regulatoryClauseId";
DROP TABLE "regulatory_clause";

CREATE TABLE "requirement_spine_topic" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "spineRevision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "requirement_spine_topic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clause_topic_map" (
    "id" TEXT NOT NULL,
    "clauseId" TEXT NOT NULL,
    "topicId" TEXT,
    "coverage" TEXT NOT NULL,
    "deltaNote" TEXT,
    "mappedBy" TEXT,
    "approvedBy" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clause_topic_map_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "atom_topic_map" (
    "id" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "mappedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "atom_topic_map_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pack_adoption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "packRevision" INTEGER NOT NULL,
    "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supersededAt" TIMESTAMP(3),
    CONSTRAINT "pack_adoption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "requirement_spine_topic_spineRevision_idx" ON "requirement_spine_topic"("spineRevision");
CREATE INDEX "requirement_spine_topic_status_idx" ON "requirement_spine_topic"("status");
CREATE UNIQUE INDEX "requirement_spine_topic_code_spineRevision_key" ON "requirement_spine_topic"("code", "spineRevision");
CREATE INDEX "clause_topic_map_clauseId_idx" ON "clause_topic_map"("clauseId");
CREATE INDEX "clause_topic_map_topicId_idx" ON "clause_topic_map"("topicId");
CREATE UNIQUE INDEX "clause_topic_map_clauseId_topicId_key" ON "clause_topic_map"("clauseId", "topicId");
CREATE INDEX "atom_topic_map_atomId_idx" ON "atom_topic_map"("atomId");
CREATE INDEX "atom_topic_map_topicId_idx" ON "atom_topic_map"("topicId");
CREATE UNIQUE INDEX "atom_topic_map_atomId_topicId_key" ON "atom_topic_map"("atomId", "topicId");
CREATE INDEX "pack_adoption_tenantId_idx" ON "pack_adoption"("tenantId");
CREATE INDEX "pack_adoption_packId_idx" ON "pack_adoption"("packId");
CREATE UNIQUE INDEX "pack_adoption_tenantId_packId_packRevision_key" ON "pack_adoption"("tenantId", "packId", "packRevision");

ALTER TABLE "clause_topic_map"
ADD CONSTRAINT "clause_topic_map_clauseId_fkey"
FOREIGN KEY ("clauseId") REFERENCES "policy_pack_clause"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clause_topic_map"
ADD CONSTRAINT "clause_topic_map_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "requirement_spine_topic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "atom_topic_map"
ADD CONSTRAINT "atom_topic_map_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "requirement_spine_topic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pack_adoption"
ADD CONSTRAINT "pack_adoption_packId_fkey"
FOREIGN KEY ("packId") REFERENCES "policy_pack"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
