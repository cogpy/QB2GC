# QB2GC Architecture Documentation

## System Overview

QB2GC (QuickBooks to GnuCash) is a microservice that enables bidirectional data synchronization between QuickBooks Online and GnuCash, using a PostgreSQL database as the central data store.

```
┌─────────────────────┐
│  QuickBooks Online  │
└──────────┬──────────┘
           │ OAuth 2.0 / SDK
           ▼
┌─────────────────────────────────────┐
│       QB2GC Microservice            │
│  ┌───────────────────────────────┐  │
│  │   gRPC Server (Port 50051)    │  │
│  │                               │  │
│  │  - Accounting Service         │  │
│  │  - Taxation Service           │  │
│  │  - GnuCashSync Service        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │    Business Logic Layer       │  │
│  │                               │  │
│  │  - QB Sync Controllers        │  │
│  │  - GnuCash Sync Service       │  │
│  │  - Entity Mapper              │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │    Data Access Layer          │  │
│  │                               │  │
│  │  - Prisma ORM                 │  │
│  │  - Connection Pool            │  │
│  └───────────────────────────────┘  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database               │
│                                     │
│  - QBClass                          │
│  - Account                          │
│  - Taxation                         │
│  - GnuCashSyncLog                   │
│  - ...other models                  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  GnuCash Desktop Application        │
│  (Local Backup)                     │
└─────────────────────────────────────┘
```

## Core Components

### 1. gRPC Server

**Technology**: `@grpc/grpc-js`, Protocol Buffers  
**Port**: 50051  
**Protocol File**: `src/hello.proto`

The gRPC server provides four main services:

- **HelloService**: Basic testing service
- **TaxationService**: Tax record management
- **Accounting**: Account and Class management (with auto-sync to GnuCash)
- **GnuCashSync**: Manual sync operations and statistics

### 2. Controllers

Located in `src/controllers/`, controllers handle gRPC requests and coordinate business logic.

#### Class.js
- Handles `CreateClass` gRPC calls
- Orchestrates QB sync and automatic GnuCash sync
- Uses streaming for efficient batch processing

#### GnuCashSync.js
- Handles manual sync operations
- Provides batch sync capabilities
- Returns sync statistics

#### Accounting.js
- Handles account creation
- Supports nested relations (Contact Info, KYC Details)

#### taxations.js
- CRUD operations for tax records
- Nested employee info and address

### 3. Services

#### GnuCashSyncService (`src/services/GnuCashSyncService.js`)

The core service responsible for syncing data to GnuCash.

**Key Classes**:

- **EntityMapper**: Transforms QuickBooks data to GnuCash format
  - Field mapping
  - Data transformation
  - Type conversions

- **GnuCashSyncService**: Main sync orchestration
  - Single entity sync
  - Batch sync
  - Error handling and retry logic
  - Statistics generation

**Sync Flow**:
```
1. Load entity from database
2. Apply entity mapping configuration
3. Transform data to GnuCash format
4. Create GnuCash account structure (XML)
5. Update entity with sync status
6. Log sync operation
```

### 4. Data Models (Prisma)

#### Core Entity Models

**QBClass**
```prisma
model QBClass {
  id               String   @id @default(uuid())
  qbId             String?  @unique
  name             String
  fullName         String?
  isSubClass       Boolean
  isActive         Boolean
  
  // GnuCash sync fields
  gcSyncStatus     SyncStatus @default(PENDING)
  gcSyncedAt       DateTime?
  gcAccountId      String?
  gcSyncError      String?
  
  createdAt        DateTime
  updatedAt        DateTime
}
```

**Account**
```prisma
model Account {
  id             String        @id @default(uuid())
  holderName     String
  accountNumber  String
  type           AccountType
  status         AccountStatus
  balance        Float
  
  // GnuCash sync fields
  gcSyncStatus   SyncStatus @default(PENDING)
  gcSyncedAt     DateTime?
  gcAccountId    String?
  gcSyncError    String?
  
  // Relations
  contactInfo    ContactInfo?
  kycDetails     KycDetails?
}
```

**Taxation**
```prisma
model Taxation {
  id                Int
  title             String
  taxRate           Float
  
  // GnuCash sync fields
  gcSyncStatus      SyncStatus @default(PENDING)
  gcSyncedAt        DateTime?
  gcAccountId       String?
  gcSyncError       String?
  
  // Relations
  employeeInfo      EmployeeInfo
  employeeAddress   EmployeeAddress
}
```

#### Sync Tracking Models

**GnuCashSyncLog**
```prisma
model GnuCashSyncLog {
  id               String      @id @default(uuid())
  entityType       String
  entityId         String
  syncStatus       SyncStatus
  syncDirection    String      @default("qb_to_gc")
  gcFilePath       String?
  errorMessage     String?
  syncStartedAt    DateTime
  syncCompletedAt  DateTime?
  retryCount       Int         @default(0)
  metadata         String?     // JSON
}
```

**SyncStatus Enum**
```prisma
enum SyncStatus {
  PENDING      // Created in DB, waiting for sync
  IN_PROGRESS  // Currently syncing
  SYNCED       // Successfully synced
  FAILED       // Sync failed, check error message
}
```

## Data Flow Patterns

### Pattern 1: Create Class with Auto-Sync

```
Client
  │
  ├─► gRPC Stream: CreateClass
  │
  ▼
Controller (Class.js)
  │
  ├─► 1. Collect streamed data
  ├─► 2. Create in local DB (Prisma)
  ├─► 3. Sync to QuickBooks
  ├─► 4. Update with QB ID & SyncToken
  ├─► 5. Send response to client ✅
  │
  └─► 6. Background: Sync to GnuCash (non-blocking)
         │
         ├─► Load entity mapping config
         ├─► Transform data
         ├─► Create GnuCash structure
         ├─► Update gcSyncStatus
         └─► Log sync operation
```

### Pattern 2: Manual GnuCash Sync

```
Client
  │
  ├─► gRPC Call: SyncClassToGnuCash(classId)
  │
  ▼
Controller (GnuCashSync.js)
  │
  ├─► Delegate to GnuCashSyncService
  │
  ▼
GnuCashSyncService
  │
  ├─► 1. Create sync log (IN_PROGRESS)
  ├─► 2. Load class from DB
  ├─► 3. Apply entity mapping
  ├─► 4. Create GnuCash account
  ├─► 5. Update class (SYNCED)
  ├─► 6. Update sync log (SYNCED)
  │
  ▼
Response to Client ✅
```

### Pattern 3: Batch Sync

```
Client
  │
  ├─► gRPC Stream: BatchSyncClassesToGnuCash
  │   └─► classId1, classId2, classId3...
  │
  ▼
Controller (GnuCashSync.js)
  │
  ├─► Collect IDs from stream
  │
  ▼
GnuCashSyncService.batchSyncToGnuCash
  │
  ├─► Split into batches (configurable size)
  ├─► For each batch:
  │   ├─► Promise.allSettled (parallel sync)
  │   └─► Continue even if some fail
  │
  ▼
Stream Results Back to Client
  └─► { total, successful, failed }
```

## Configuration Management

### Entity Mapping Configuration

File: `config/entityMapping.json`

Structure:
```json
{
  "version": "1.0.0",
  "mappings": {
    "EntityName": {
      "qbEntity": "QuickBooks entity name",
      "gcEntity": "GnuCash entity type",
      "enabled": true,
      "fieldMappings": {
        "qbFieldName": {
          "gcField": "gnucashFieldName",
          "transform": "transformation_type",
          "required": boolean,
          "mappingRules": { ... }
        }
      },
      "defaultValues": { ... }
    }
  },
  "syncRules": {
    "conflictResolution": "qb_wins",
    "autoSync": false,
    "batchSize": 10,
    "retryAttempts": 3
  },
  "gnucashConfig": { ... }
}
```

### Transformation Types

- **string**: Direct string conversion
- **boolean_inverse**: Invert boolean (Active → !placeholder)
- **decimal**: Parse to float/decimal
- **percentage_to_string**: Convert 15 → "15%"
- **account_type_mapping**: Map using provided rules

## Error Handling Strategy

### Three-Tier Error Handling

1. **Database Level** (Prisma)
   - Transaction rollback on QB sync failure
   - Constraint violations
   - Connection errors

2. **QuickBooks Level**
   - API errors (rate limits, auth failures)
   - SyncToken conflicts
   - Validation errors
   → Return error to client immediately

3. **GnuCash Level** (Non-blocking)
   - Mapping errors
   - Transformation failures
   - File system errors
   → Log error, set status to FAILED, continue

### Retry Strategy

- Configurable retry attempts (default: 3)
- Exponential backoff (future enhancement)
- Manual retry via `SyncClassToGnuCash` API

## Security Considerations

### QuickBooks OAuth 2.0

- Access tokens stored in `token.json`
- Refresh token rotation
- Sandbox vs Production environments

### Database Security

- Connection via DATABASE_URL (env variable)
- Prepared statements (Prisma ORM)
- No raw SQL injection points

### gRPC Communication

- Current: Insecure (development)
- Production: Should use TLS/SSL

## Performance Optimizations

### 1. Streaming
- gRPC streaming for batch operations
- Reduces memory footprint
- Enables real-time progress updates

### 2. Batch Processing
- Configurable batch size
- Parallel processing with `Promise.allSettled`
- Prevents overwhelming external APIs

### 3. Background Processing
- GnuCash sync happens asynchronously
- Doesn't block QuickBooks sync response
- Improves perceived performance

### 4. Database Optimization
- UUID primary keys for distributed systems
- Indexed foreign keys
- Connection pooling (Prisma)

## Monitoring and Observability

### Logging
- Prisma query logging (configurable)
- Console logs for sync operations
- Emoji-based log levels (✅, ❌, 🔄, ⚠️)

### Sync Tracking
- `GnuCashSyncLog` table for audit trail
- Sync status on each entity
- Statistics endpoint for monitoring

### Metrics (Future Enhancement)
- Sync success rate
- Average sync duration
- Failed sync count by entity type
- Retry frequency

## Scalability Considerations

### Current Limitations
- Single gRPC server instance
- In-process background jobs
- File-based token storage

### Future Enhancements
- Multi-instance deployment (load balancer)
- Queue-based background processing (Bull, BullMQ)
- Distributed token storage (Redis, DB)
- Horizontal database scaling (read replicas)

## Testing Strategy

### Unit Tests (Future)
- EntityMapper transformations
- GnuCash account structure generation
- Error handling

### Integration Tests (Future)
- gRPC service endpoints
- Database transactions
- QB API mocking

### E2E Tests (Future)
- Full sync flow
- Batch operations
- Error scenarios

## Deployment Architecture

### Recommended Production Setup

```
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ QB2GC  │ │ QB2GC  │
│ Node 1 │ │ Node 2 │
└────┬───┘ └────┬───┘
     │          │
     └────┬─────┘
          ▼
┌──────────────────┐
│   PostgreSQL     │
│   (Primary)      │
└──────────────────┘
          │
          ▼
┌──────────────────┐
│   PostgreSQL     │
│   (Replica)      │
└──────────────────┘
```

### Environment-Specific Configs

- **Development**: Sandbox QB, local DB
- **Staging**: Sandbox QB, cloud DB
- **Production**: Production QB, managed DB, monitoring

## API Versioning

Current version: **1.0.0**

Future versioning strategy:
- Proto file versioning
- Backward compatibility maintenance
- Deprecation notices

## Dependencies

### Core Dependencies
- `@grpc/grpc-js`: gRPC implementation
- `@prisma/client`: ORM
- `node-quickbooks`: QB SDK
- `express`: OAuth server
- `dotenv`: Environment config

### Additional Dependencies
- `gnucash`: GnuCash library (optional)
- `axios`: HTTP client
- `mongoose`: MongoDB (if needed)

## License

ISC
