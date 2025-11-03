# Database Migration Guide for Universal Integration

## Overview

This guide covers migrating your database to support the Universal Integration Framework.

## New Models Added

### 1. UniversalEntity

Stores normalized entities from all external systems:

```sql
CREATE TABLE "UniversalEntity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "universalType" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceEntityType" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "coreData" TEXT NOT NULL,
  "extendedData" TEXT,
  "rawData" TEXT,
  "syncStatus" "SyncStatus" DEFAULT 'PENDING',
  "lastSyncedAt" TIMESTAMP(3),
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN DEFAULT true,
  
  CONSTRAINT "UniversalEntity_sourceSystem_sourceEntityType_sourceEntityId_key" 
    UNIQUE ("sourceSystem", "sourceEntityType", "sourceEntityId")
);

CREATE INDEX "UniversalEntity_universalType_idx" ON "UniversalEntity"("universalType");
CREATE INDEX "UniversalEntity_sourceSystem_idx" ON "UniversalEntity"("sourceSystem");
```

### 2. EntityMapping

Maps universal entities to target systems:

```sql
CREATE TABLE "EntityMapping" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "universalEntityId" UUID NOT NULL,
  "targetSystem" TEXT NOT NULL,
  "targetEntityType" TEXT NOT NULL,
  "targetEntityId" TEXT,
  "mappingConfig" TEXT NOT NULL,
  "syncStatus" "SyncStatus" DEFAULT 'PENDING',
  "lastSyncedAt" TIMESTAMP(3),
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "EntityMapping_universalEntityId_targetSystem_targetEntityType_key"
    UNIQUE ("universalEntityId", "targetSystem", "targetEntityType"),
    
  CONSTRAINT "EntityMapping_universalEntityId_fkey"
    FOREIGN KEY ("universalEntityId") 
    REFERENCES "UniversalEntity"("id") 
    ON DELETE CASCADE
);

CREATE INDEX "EntityMapping_targetSystem_idx" ON "EntityMapping"("targetSystem");
```

### 3. UniversalSyncLog

Tracks all cross-system sync operations:

```sql
CREATE TABLE "UniversalSyncLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "universalEntityId" UUID,
  "operation" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "targetSystem" TEXT NOT NULL,
  "syncStatus" "SyncStatus" DEFAULT 'PENDING',
  "syncDirection" TEXT NOT NULL,
  "errorMessage" TEXT,
  "syncStartedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "syncCompletedAt" TIMESTAMP(3),
  "retryCount" INTEGER DEFAULT 0,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "UniversalSyncLog_universalEntityId_fkey"
    FOREIGN KEY ("universalEntityId")
    REFERENCES "UniversalEntity"("id")
    ON DELETE SET NULL
);

CREATE INDEX "UniversalSyncLog_sourceSystem_idx" ON "UniversalSyncLog"("sourceSystem");
CREATE INDEX "UniversalSyncLog_targetSystem_idx" ON "UniversalSyncLog"("targetSystem");
CREATE INDEX "UniversalSyncLog_syncStatus_idx" ON "UniversalSyncLog"("syncStatus");
```

### 4. SystemIntegration

Stores configuration for each integrated system:

```sql
CREATE TABLE "SystemIntegration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "systemName" TEXT UNIQUE NOT NULL,
  "systemType" TEXT NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "connectionConfig" TEXT NOT NULL,
  "authType" TEXT NOT NULL,
  "autoSync" BOOLEAN DEFAULT false,
  "syncInterval" INTEGER,
  "batchSize" INTEGER DEFAULT 10,
  "retryAttempts" INTEGER DEFAULT 3,
  "lastSyncAt" TIMESTAMP(3),
  "syncEnabled" BOOLEAN DEFAULT true,
  "healthStatus" TEXT DEFAULT 'unknown',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SystemIntegration_systemType_idx" ON "SystemIntegration"("systemType");
CREATE INDEX "SystemIntegration_enabled_idx" ON "SystemIntegration"("enabled");
```

## Migration Steps

### Option 1: Using Prisma Migrate (Recommended)

1. **Generate Migration:**
```bash
npx prisma migrate dev --name add_universal_integration
```

2. **Review Migration:**
Check `prisma/migrations/` for generated SQL

3. **Apply Migration:**
```bash
npx prisma migrate deploy
```

### Option 2: Manual SQL Execution

If you prefer manual control:

1. **Connect to Database:**
```bash
psql $DATABASE_URL
```

2. **Run SQL Scripts:**
Execute the CREATE TABLE statements above in order

3. **Update Prisma Client:**
```bash
npx prisma generate
```

## Data Migration (Optional)

### Migrate Existing QB/GnuCash Data

If you have existing data in QBClass, Account, or Taxation tables, you can migrate them to the universal model:

```javascript
// migrate-to-universal.js
import { PrismaClient } from '@prisma/client';
import { UniversalIntegrationService } from './src/services/UniversalIntegrationService.js';

const prisma = new PrismaClient();
const universalService = new UniversalIntegrationService();

async function migrateExistingData() {
  await universalService.initialize();
  
  // Migrate QBClass entries
  const qbClasses = await prisma.qBClass.findMany();
  for (const qbClass of qbClasses) {
    await universalService.syncEntityToUniversal(
      'QuickBooks',
      'Class',
      qbClass.id,
      {
        qbId: qbClass.qbId,
        name: qbClass.name,
        fullName: qbClass.fullName,
        isActive: qbClass.isActive
      }
    );
  }
  
  // Migrate Account entries
  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    await universalService.syncEntityToUniversal(
      'QuickBooks',
      'Account',
      account.id,
      {
        accountNumber: account.accountNumber,
        holderName: account.holderName,
        type: account.type,
        balance: account.balance,
        isActive: account.isActive
      }
    );
  }
  
  console.log('✅ Migration completed');
}

migrateExistingData();
```

Run migration:
```bash
node migrate-to-universal.js
```

## Verification

### Check Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%Universal%' 
  OR table_name = 'EntityMapping' 
  OR table_name = 'SystemIntegration';
```

Expected output:
- UniversalEntity
- EntityMapping
- UniversalSyncLog
- SystemIntegration

### Verify Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('UniversalEntity', 'EntityMapping', 'UniversalSyncLog', 'SystemIntegration');
```

### Test Data Insert

```sql
-- Insert a test universal entity
INSERT INTO "UniversalEntity" (
  "universalType",
  "sourceSystem",
  "sourceEntityType",
  "sourceEntityId",
  "coreData"
) VALUES (
  'Person',
  'TestSystem',
  'Contact',
  'test-001',
  '{"externalId":"test-001","name":"Test User","email":"test@example.com"}'
);

-- Verify
SELECT * FROM "UniversalEntity" WHERE "sourceSystem" = 'TestSystem';
```

## Rollback Procedure

If needed, rollback the migration:

### Using Prisma

```bash
npx prisma migrate resolve --rolled-back add_universal_integration
```

### Manual Rollback

```sql
DROP TABLE IF EXISTS "SystemIntegration" CASCADE;
DROP TABLE IF EXISTS "UniversalSyncLog" CASCADE;
DROP TABLE IF EXISTS "EntityMapping" CASCADE;
DROP TABLE IF EXISTS "UniversalEntity" CASCADE;
```

## Performance Considerations

### Recommended Indexes

The migration includes these performance indexes:

- `UniversalEntity_universalType_idx` - Fast filtering by type
- `UniversalEntity_sourceSystem_idx` - Fast filtering by system
- `EntityMapping_targetSystem_idx` - Fast lookup by target
- `UniversalSyncLog_syncStatus_idx` - Fast sync status queries

### Additional Indexes (Optional)

For high-volume deployments:

```sql
-- Index on sync timestamps for time-based queries
CREATE INDEX "UniversalEntity_lastSyncedAt_idx" 
  ON "UniversalEntity"("lastSyncedAt");

-- Composite index for common query patterns
CREATE INDEX "UniversalEntity_type_system_idx" 
  ON "UniversalEntity"("universalType", "sourceSystem");

-- Index on sync logs for error analysis
CREATE INDEX "UniversalSyncLog_error_idx" 
  ON "UniversalSyncLog"("syncStatus") 
  WHERE "syncStatus" = 'FAILED';
```

## Monitoring

### Check Migration Status

```sql
-- Count entities by type
SELECT "universalType", COUNT(*) 
FROM "UniversalEntity" 
GROUP BY "universalType";

-- Count mappings by system
SELECT "targetSystem", COUNT(*) 
FROM "EntityMapping" 
GROUP BY "targetSystem";

-- Sync success rate
SELECT 
  "syncStatus", 
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "UniversalSyncLog"
GROUP BY "syncStatus";
```

## Troubleshooting

### Issue: Migration Fails

**Solution:**
- Check DATABASE_URL is correct
- Verify PostgreSQL version (>=12 required)
- Ensure user has CREATE TABLE permissions

### Issue: Foreign Key Constraints Fail

**Solution:**
- Ensure tables are created in order
- Check for existing data conflicts
- Verify CASCADE options are correct

### Issue: Performance Degradation

**Solution:**
- Run VACUUM ANALYZE on new tables
- Ensure indexes are created
- Check query plans with EXPLAIN

## Post-Migration Checklist

- [ ] All 4 new tables created
- [ ] All indexes created
- [ ] Foreign keys established
- [ ] Test data insertion works
- [ ] Prisma client regenerated
- [ ] Application starts successfully
- [ ] Sample sync operation works
- [ ] Existing QB/GnuCash sync still works

## Support

For issues:
1. Check Prisma migration logs
2. Review database error messages
3. Verify schema.prisma matches database
4. Run `npx prisma validate` to check schema

## Next Steps

After successful migration:

1. Configure system integrations in `SystemIntegration` table
2. Test syncing data from various systems
3. Monitor sync logs for errors
4. Set up automated backups for new tables
5. Review and optimize indexes based on usage patterns
