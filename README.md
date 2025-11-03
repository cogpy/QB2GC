# 📚 QuickBooks to GnuCash Sync Microservice (QB2GC)

This Node.js microservice syncs data between **QuickBooks Online**, a **local database** (via Prisma ORM), and **GnuCash** using **gRPC streaming**.  
It receives multiple entity entries (Classes, Accounts, Taxations) through a gRPC stream, saves them to the database, syncs each to QuickBooks Online, and then syncs to GnuCash for local backup.

---

## ⚙️ Tech Stack

- 🟨 **Node.js**
- 🔄 **gRPC** (for efficient streaming)
- 📊 **Prisma ORM** (for PostgreSQL/MySQL)
- 🧾 **QuickBooks Online SDK**
- 💰 **GnuCash Integration** (for local desktop backup)
- 📝 **Protocol Buffers** (`.proto`)
- 🗂️ **Entity Mapping Configuration** (JSON-based)

---

## 🔁 Enhanced Data Flow

```
Client gRPC Stream
    ⬇
Collect Entity Data (Class/Account/Taxation)
    ⬇
Save to Local DB via Prisma
    ⬇
Sync Each Entity to QuickBooks Online
    ⬇
Update Local Record with QB ID + SyncToken
    ⬇
Sync to GnuCash (Background Process)
    ⬇
Update Sync Status & GnuCash ID
    ⬇
Respond with Success Message & Created IDs
```

---

## 🆕 GnuCash Integration Features

### Entity Mapping Configuration

The system uses a JSON-based configuration (`config/entityMapping.json`) to map QuickBooks entities to GnuCash format:

- **Configurable field mappings** between QB and GnuCash
- **Data transformation rules** (type conversions, formatting)
- **Default values** for GnuCash-specific fields
- **Sync rules** (conflict resolution, batch size, retry logic)

### Sync Status Tracking

Each entity (Class, Account, Taxation) now tracks:
- `gcSyncStatus`: PENDING | IN_PROGRESS | SYNCED | FAILED
- `gcSyncedAt`: Timestamp of last GnuCash sync
- `gcAccountId`: GnuCash account ID if synced
- `gcSyncError`: Error message if sync failed

### GnuCash Sync Log

All sync operations are logged in `GnuCashSyncLog` table:
- Entity type and ID
- Sync status and direction
- Error messages
- Retry count
- Metadata (JSON)

---

## 🚀 Available gRPC Services

### 1. Accounting Service
- `CreateAccount` - Create and sync accounts
- `CreateClass` - Create and sync classes (auto-syncs to GnuCash)

### 2. TaxationService
- `CreateTaxations` - Create tax records
- `GetTaxationById` - Retrieve tax record
- `UpdateTaxations` - Update tax records

### 3. GnuCashSync Service (NEW)
- `SyncClassToGnuCash` - Manually sync a single class
- `BatchSyncClassesToGnuCash` - Batch sync multiple classes
- `SyncAccountToGnuCash` - Manually sync a single account
- `BatchSyncAccountsToGnuCash` - Batch sync multiple accounts
- `GetSyncStatistics` - Get sync statistics

---

## 📄 Example Usage

### Creating a Class (Auto-syncs to QB & GnuCash)

```json
{
  "classes": [
    {
      "qb_id": "",
      "name": "Software Dept",
      "full_name": "Company / Software Dept",
      "is_sub_class": true,
      "is_active": true,
      "domain_source": "QBO",
      "version_token": 0,
      "is_sparse": false
    }
  ]
}
```

### Manually Syncing to GnuCash

```protobuf
// Sync a single class
message GnuCashSyncRequest {
  string classId = "class-uuid-here";
}

// Response
message GnuCashSyncResponse {
  bool success = true;
  string message = "✅ Class synced to GnuCash";
  string gcAccountId = "gnucash-account-guid";
  string data = "{...}"; // GnuCash account structure
}
```

---

## 🧩 Understanding the Proto File

```protobuf
syntax = "proto3";

message QBClass {
  string qb_id = 1;
  string name = 2;
  string full_name = 3;
  bool is_sub_class = 4;
  bool is_active = 5;
  string domain_source = 6;
  int32 version_token = 7;
  bool is_sparse = 8;
  string created_at = 9;
  string updated_at = 10;
}

service GnuCashSync {
  rpc SyncClassToGnuCash (GnuCashSyncRequest) returns (GnuCashSyncResponse);
  rpc BatchSyncClassesToGnuCash (stream GnuCashBatchRequest) returns (stream GnuCashBatchResponse);
  rpc GetSyncStatistics (Empty) returns (SyncStatisticsResponse);
}
```

---

## 🧠 Key Concepts

### SyncToken (QuickBooks)
SyncToken is QuickBooks' way to track versioning.
- If a record changes in QB, it increases the SyncToken
- To update a record, you must send the latest SyncToken, or your request will be rejected

### Entity Mapping
The system maps QuickBooks entities to GnuCash format using configurable rules:
- **Type mapping**: QB account types → GnuCash account types
- **Field transformation**: Boolean inverse, percentage to string, etc.
- **Default values**: Currency, parent accounts, etc.

### Sync Status
- **PENDING**: Entity created in DB, waiting for GnuCash sync
- **IN_PROGRESS**: Currently syncing to GnuCash
- **SYNCED**: Successfully synced to GnuCash
- **FAILED**: Sync to GnuCash failed (check gcSyncError)

---

## ✅ Success Response

```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"],
  "message": "✅ Classes created and synced successfully to QuickBooks"
}
```

Note: GnuCash sync happens in the background. Check sync status with `GetSyncStatistics`.

---

## 🚨 Error Handling

If database creation or QuickBooks sync fails:
```json
{
  "ids": [],
  "message": "❌ Error during creation or QB sync"
}
```

If GnuCash sync fails (non-blocking):
- Entity remains in database with `gcSyncStatus = FAILED`
- Error details stored in `gcSyncError` field
- Can be retried using `SyncClassToGnuCash` or `SyncAccountToGnuCash`

---

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
# QuickBooks OAuth
CLIENT_ID=your_quickbooks_client_id
CLIENT_SECRET=your_quickbooks_client_secret
REDIRECT_URI=http://localhost:3000/callback
ENV=sandbox

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/qb2gc_db

# GnuCash (Optional)
GNUCASH_AUTO_SYNC=false
GNUCASH_OUTPUT_PATH=/path/to/gnucash/files
```

### Entity Mapping Configuration

Edit `config/entityMapping.json` to customize:
- Field mappings between QB and GnuCash
- Data transformation rules
- Default values
- Sync rules (batch size, retry attempts, conflict resolution)

---

## 🤝 Contributing

Want to improve this project? PRs are welcome!

---

## �� License

ISC
