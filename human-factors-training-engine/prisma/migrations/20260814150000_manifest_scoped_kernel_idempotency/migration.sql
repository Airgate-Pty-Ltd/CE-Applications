DROP INDEX "mai_event_tenantId_snapshotHash_key";
CREATE UNIQUE INDEX "mai_event_tenantId_ruleManifestId_snapshotHash_key"
ON "mai_event"("tenantId", "ruleManifestId", "snapshotHash");

DROP INDEX "mai_system_condition_tenantId_snapshotHash_ruleId_key";
CREATE UNIQUE INDEX "mai_system_condition_tenantId_ruleManifestId_snapshotHash_ruleId_key"
ON "mai_system_condition"("tenantId", "ruleManifestId", "snapshotHash", "ruleId");
