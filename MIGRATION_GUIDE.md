# Migration Guide: Adding GnuCash Sync Support

This guide helps you migrate your existing QB2GC installation to support GnuCash synchronization.

## Prerequisites

- PostgreSQL database (existing or new)
- QuickBooks Online account with API access
- Node.js 18+ installed

## Step 1: Update Dependencies

The GnuCash sync functionality uses the existing dependencies. Run:

```bash
npm install
```

## Step 2: Update Environment Variables

Copy the new environment variables from `.env.example` to your `.env` file:

```bash
# Add to your existing .env file:
GNUCASH_AUTO_SYNC=false
GNUCASH_OUTPUT_PATH=/path/to/gnucash/files
```

## Step 3: Update Database Schema

The new version adds GnuCash sync tracking fields to your existing models. You need to run a database migration:

### Option A: Using Prisma Migrate (Recommended)

```bash
# Generate the Prisma client
npx prisma generate

# Create and apply the migration
npx prisma migrate dev --name add_gnucash_sync_support
```

### Option B: Manual SQL Migration

If you prefer manual migration, here are the SQL statements:

```sql
-- Add SyncStatus enum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SYNCED', 'FAILED');

-- Add GnuCash sync fields to QBClass
ALTER TABLE "QBClass" 
  ADD COLUMN "gcSyncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "gcSyncedAt" TIMESTAMP(3),
  ADD COLUMN "gcAccountId" TEXT,
  ADD COLUMN "gcSyncError" TEXT;

-- Add GnuCash sync fields to Account
ALTER TABLE "Account" 
  ADD COLUMN "gcSyncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "gcSyncedAt" TIMESTAMP(3),
  ADD COLUMN "gcAccountId" TEXT,
  ADD COLUMN "gcSyncError" TEXT;

-- Add GnuCash sync fields to Taxation
ALTER TABLE "Taxation" 
  ADD COLUMN "gcSyncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "gcSyncedAt" TIMESTAMP(3),
  ADD COLUMN "gcAccountId" TEXT,
  ADD COLUMN "gcSyncError" TEXT;

-- Create GnuCashSyncLog table
CREATE TABLE "GnuCashSyncLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
  "syncDirection" TEXT NOT NULL DEFAULT 'qb_to_gc',
  "gcFilePath" TEXT,
  "errorMessage" TEXT,
  "syncStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncCompletedAt" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "GnuCashSyncLog_pkey" PRIMARY KEY ("id")
);
```

## Step 4: Configure Entity Mappings

The default entity mapping configuration is located at `config/entityMapping.json`. You can customize it to match your business needs:

```json
{
  "mappings": {
    "Class": {
      "enabled": true,
      "fieldMappings": {
        "name": {
          "gcField": "name",
          "transform": "string",
          "required": true
        }
        // ... more mappings
      }
    }
  },
  "syncRules": {
    "conflictResolution": "qb_wins",
    "autoSync": false,
    "batchSize": 10,
    "retryAttempts": 3
  }
}
```

### Key Configuration Options:

- **enabled**: Enable/disable sync for specific entity types
- **fieldMappings**: Map QuickBooks fields to GnuCash fields
- **transform**: Data transformation rules (string, boolean_inverse, decimal, etc.)
- **syncRules.autoSync**: Automatically sync after QuickBooks sync (currently happens in background)
- **syncRules.batchSize**: Number of entities to sync in one batch
- **syncRules.retryAttempts**: Number of retry attempts on failure

## Step 5: Restart Your Server

```bash
npm run dev
```

You should see:

```
✅ GnuCash Sync Service initialized
gRPC server running on port 50051
📊 Services available:
  - HelloService
  - TaxationService
  - Accounting
  - GnuCashSync
```

## Step 6: Test the Integration

### Option A: Use the Example Client

```bash
node src/examples/gnucashSyncExample.js
```

### Option B: Test with gRPC Client

Create a gRPC client and call the new services:

```javascript
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const PROTO_PATH = './src/hello.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const hello_proto = grpc.loadPackageDefinition(packageDefinition).hello;

const client = new hello_proto.GnuCashSync(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Get sync statistics
client.GetSyncStatistics({}, (error, response) => {
  console.log('Statistics:', response);
});
```

## What's Changed?

### Automatic GnuCash Sync

When you create a Class using the `CreateClass` gRPC method:

1. ✅ Class is saved to local database
2. ✅ Class is synced to QuickBooks Online
3. ✅ Response is sent to client (immediate)
4. 🔄 Class is synced to GnuCash (background, non-blocking)

### New gRPC Services

- `SyncClassToGnuCash` - Manually sync a single class
- `BatchSyncClassesToGnuCash` - Batch sync multiple classes
- `SyncAccountToGnuCash` - Manually sync a single account
- `BatchSyncAccountsToGnuCash` - Batch sync multiple accounts
- `GetSyncStatistics` - Get sync statistics

### Data Model Changes

Each synced entity now has:
- `gcSyncStatus` - Current sync status
- `gcSyncedAt` - Last sync timestamp
- `gcAccountId` - GnuCash account GUID
- `gcSyncError` - Error message if sync failed

## Backward Compatibility

✅ **Fully backward compatible!**

- Existing API calls work unchanged
- GnuCash sync is additive (doesn't break existing flows)
- QuickBooks sync behavior unchanged
- Database migrations add new fields only (no deletions)

## Troubleshooting

### GnuCash Sync Failing

Check the sync status:

```sql
SELECT "gcSyncStatus", "gcSyncError" FROM "QBClass" WHERE "gcSyncStatus" = 'FAILED';
```

Retry failed syncs:

```javascript
// Get failed class IDs
const failedClasses = await prisma.qBClass.findMany({
  where: { gcSyncStatus: 'FAILED' },
  select: { id: true }
});

// Retry sync
for (const cls of failedClasses) {
  await syncClassToGnuCash(cls.id);
}
```

### Configuration Not Loading

Ensure `config/entityMapping.json` exists and is valid JSON:

```bash
cat config/entityMapping.json | jq .
```

### Database Connection Issues

Verify your DATABASE_URL in `.env`:

```bash
npx prisma db push
```

## Rolling Back

If you need to rollback:

1. Stop the server
2. Revert to the previous version: `git checkout <previous-commit>`
3. Run: `npm install`
4. Optionally, rollback the database migration

## Support

For issues or questions:
- Check the README.md for documentation
- Review logs in the console
- Check `GnuCashSyncLog` table for sync history

## Next Steps

- Configure entity mappings for your specific needs
- Set up automated sync monitoring
- Integrate GnuCash file export to desktop
- Set up backup strategies for synced data
