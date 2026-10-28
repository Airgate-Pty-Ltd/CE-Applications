-- This table is created by the immediately preceding migration and is therefore
-- empty while a new hosted deployment applies the migration chain.
ALTER TABLE "mai_content_revision_proposal"
ADD COLUMN "interventionId" TEXT NOT NULL;
