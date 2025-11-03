# 📚 Universal Integration Platform (QB2GC v2.0)

**Formerly:** QuickBooks to GnuCash Sync  
**Now:** Universal integration framework for **ANY software system**

This Node.js microservice has evolved from a QuickBooks-GnuCash integration into a **universal integration platform** that can automatically sync data between **any software system** through a centralized universal data model.

## 🌟 What's New in v2.0

### 🌐 Universal Integration Framework

The platform now supports **10+ major software systems** out of the box and can be extended to support **ANY system** through configuration:

- **Accounting:** QuickBooks, GnuCash, Xero
- **CRM:** Salesforce, HubSpot  
- **ERP:** SAP
- **E-Commerce:** Shopify
- **Payment:** Stripe
- **Productivity:** Microsoft 365, Slack

**🎯 Key Innovation:** Define entities in **one system**, automatically sync to **all compatible systems** through universal entity types.

### 11 Universal Entity Types

- Person, Organization, Product, FinancialAccount
- OrganizationalUnit, Order, Invoice, Transaction
- Deal, TaxCode, Group

**Learn more:** See [UNIVERSAL_INTEGRATION.md](./UNIVERSAL_INTEGRATION.md) for complete documentation.

---

## ⚙️ Tech Stack

- 🟨 **Node.js**
- 🔄 **gRPC** (for efficient streaming)
- 📊 **Prisma ORM** (for PostgreSQL/MySQL)
- 🧾 **QuickBooks Online SDK**
- 💰 **GnuCash Integration** (for local desktop backup)
- 📝 **Protocol Buffers** (`.proto`)
- 🗂️ **Entity Mapping Configuration** (JSON-based)
- 🌐 **Universal Schema Registry** (supports 10+ systems) ⭐ NEW

---

## 🔁 Universal Data Flow

```
┌─────────────────────────────────────────────────────────┐
│          ANY Source System (Salesforce, SAP, etc.)      │
└────────────────────┬────────────────────────────────────┘
                     │ gRPC API
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Universal Integration Layer                      │
│  - Normalize to Universal Entity Types                  │
│  - Store in Universal Entity Database                   │
└────────────────────┬────────────────────────────────────┘
                     │ Auto-sync to all compatible systems
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  QuickBooks  │ │  Salesforce  │ │     SAP      │
└──────────────┘ └──────────────┘ └──────────────┘
         ▼           ▼           ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   GnuCash    │ │   HubSpot    │ │   Shopify    │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Traditional Flow (Still Supported):**
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

## 🚀 Available gRPC Services

### 1. Universal Integration Service ⭐ NEW
- `SyncToUniversal` - Sync entity from ANY system to universal model
- `BatchSyncToUniversal` - Batch sync entities
- `MapToSystem` - Map universal entity to target system
- `SyncToAllSystems` - Sync to all compatible systems automatically
- `QueryEntities` - Query universal entities
- `GetSupportedSystems` - List all supported systems
- `GetUniversalTypes` - List all universal entity types
- `GetIntegrationStatistics` - Get integration statistics

### 2. Accounting Service
- `CreateAccount` - Create and sync accounts
- `CreateClass` - Create and sync classes (auto-syncs to GnuCash)

### 2. Accounting Service
- `CreateAccount` - Create and sync accounts
- `CreateClass` - Create and sync classes (auto-syncs to GnuCash)

### 3. TaxationService
- `CreateTaxations` - Create tax records
- `GetTaxationById` - Retrieve tax record
- `UpdateTaxations` - Update tax records

### 4. GnuCashSync Service
- `SyncClassToGnuCash` - Manually sync a single class
- `BatchSyncClassesToGnuCash` - Batch sync multiple classes
- `SyncAccountToGnuCash` - Manually sync a single account
- `BatchSyncAccountsToGnuCash` - Batch sync multiple accounts
- `GetSyncStatistics` - Get sync statistics

---

## 📄 Universal Integration Examples

### Example 1: Sync Salesforce Contact to Universal Model

```javascript
// Sync a Salesforce contact
const response = await client.SyncToUniversal({
  sourceSystem: "Salesforce",
  entityType: "Contact",
  sourceEntityId: "003xx000004TmiH",
  sourceData: JSON.stringify({
    FirstName: "John",
    LastName: "Doe",
    Email: "john.doe@example.com",
    Title: "VP of Sales"
  })
});

// Result: Universal entity created
// Type: Person
// Can now be synced to HubSpot, Microsoft 365, Slack, etc.
```

### Example 2: Sync to All Compatible Systems

```javascript
// Automatically sync John Doe to ALL systems that support "Person" entities
await client.SyncToAllSystems({
  universalEntityId: response.universalEntityId
});

// John Doe is now in:
// - Salesforce (source)
// - HubSpot as Contact
// - Microsoft 365 as User
// - Slack as User
// - Shopify as Customer
// - Stripe as Customer
```

### Example 3: Query Universal Entities

```javascript
// Find all Person entities from Salesforce
const entities = await client.QueryEntities({
  universalType: "Person",
  sourceSystem: "Salesforce",
  limit: 100
});
```

### Example 4: List Supported Systems

```javascript
// Get all supported systems
const systems = await client.GetSupportedSystems({});

// Returns: QuickBooks, Salesforce, SAP, Shopify, 
//          HubSpot, Stripe, Xero, Microsoft 365, 
//          Slack, GnuCash
```

---

## 📄 Traditional QuickBooks-GnuCash Examples

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
