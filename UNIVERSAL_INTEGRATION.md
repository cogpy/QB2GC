# Universal Integration Framework

## Overview

The Universal Integration Framework extends QB2GC into a **generalized architecture** that can integrate **ANY software system** with **any other software system** through a universal data model. This enables automatic, persistent integration across all enterprise software platforms.

## Problem Solved

Previously, integrating different software systems required:
- Custom point-to-point integrations for each system pair
- Duplicate mapping logic for each integration
- No central source of truth for entity relationships
- Difficulty scaling to many systems

**The Universal Integration Framework solves this by:**
- Providing a single universal data model
- Mapping all systems to universal entity types
- Enabling automatic cross-system synchronization
- Supporting infinite extensibility for new systems

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL INTEGRATION LAYER                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │          Universal Schema Registry                          │    │
│  │  - 10+ Software Systems Supported                          │    │
│  │  - 11 Universal Entity Types                               │    │
│  │  - Dynamic Field Mapping                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │          Universal Entity Database                          │    │
│  │  - UniversalEntity: Normalized entities from all systems   │    │
│  │  - EntityMapping: Cross-system mappings                    │    │
│  │  - UniversalSyncLog: Complete audit trail                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  QuickBooks   │         │   Salesforce  │         │      SAP      │
│   +GnuCash    │         │   +HubSpot    │         │  +Microsoft   │
└───────────────┘         └───────────────┘         └───────────────┘
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│    Shopify    │         │     Stripe    │         │     Xero      │
│    +Slack     │         │               │         │               │
└───────────────┘         └───────────────┘         └───────────────┘
```

## Supported Systems

The framework currently supports **10+ major software systems** out of the box:

### Accounting Systems
- **QuickBooks Online** - Cloud accounting platform
- **GnuCash** - Desktop accounting software
- **Xero** - Cloud accounting platform

### CRM Systems
- **Salesforce** - Enterprise CRM
- **HubSpot** - Marketing & Sales CRM

### ERP Systems
- **SAP** - Enterprise resource planning

### E-Commerce
- **Shopify** - E-commerce platform

### Payment Processing
- **Stripe** - Payment processing

### Productivity
- **Microsoft 365** - Business productivity suite
- **Slack** - Team communication

**Each system can be extended with additional entity types as needed.**

## Universal Entity Types

The framework defines **11 universal entity types** that represent common business concepts:

1. **Person** - Individual human beings (customers, contacts, employees)
2. **Organization** - Business entities and companies
3. **Product** - Products or service offerings
4. **FinancialAccount** - Financial accounts in accounting systems
5. **OrganizationalUnit** - Departments, divisions, teams
6. **Order** - Sales or purchase orders
7. **Invoice** - Invoices and bills
8. **Transaction** - Financial transactions
9. **Deal** - Sales opportunities
10. **TaxCode** - Tax codes and taxation rules
11. **Group** - Groups and teams

Each universal type has:
- **Core fields** - Essential fields present in all systems
- **Extended fields** - Optional fields for rich data
- **Transformation rules** - How to convert between systems

## How It Works

### 1. Entity Ingestion

When an entity is created or updated in any source system:

```javascript
// Example: Sync a Salesforce Contact to Universal Model
const result = await client.SyncToUniversal({
  sourceSystem: "Salesforce",
  entityType: "Contact",
  sourceEntityId: "003xx000004TmiH",
  sourceData: JSON.stringify({
    Id: "003xx000004TmiH",
    FirstName: "John",
    LastName: "Doe",
    Email: "john.doe@example.com",
    Phone: "+1-555-0100",
    Title: "VP of Sales"
  })
});

// Result: Universal entity created with type "Person"
// {
//   id: "uuid-xxx",
//   universalType: "Person",
//   sourceSystem: "Salesforce",
//   coreData: {
//     externalId: "003xx000004TmiH",
//     firstName: "John",
//     lastName: "Doe",
//     email: "john.doe@example.com",
//     phone: "+1-555-0100",
//     jobTitle: "VP of Sales"
//   }
// }
```

### 2. Cross-System Mapping

The universal entity can now be mapped to **any other system**:

```javascript
// Map to HubSpot
await client.MapToSystem({
  universalEntityId: "uuid-xxx",
  targetSystem: "HubSpot",
  targetEntityType: "Contact"
});

// Result: Mapping created with HubSpot format
// {
//   firstname: "John",
//   lastname: "Doe",
//   email: "john.doe@example.com",
//   jobtitle: "VP of Sales"
// }
```

### 3. Automatic Multi-System Sync

Sync to **all compatible systems** automatically:

```javascript
// Sync John Doe to ALL systems that support "Person" entities
await client.SyncToAllSystems({
  universalEntityId: "uuid-xxx"
});

// Result: John Doe is now synced to:
// - Salesforce (source)
// - HubSpot Contact
// - Microsoft 365 User
// - Slack User
// - Shopify Customer
// - Stripe Customer
```

## Key Features

### 🔄 Bidirectional Sync
- Entities can flow in both directions
- Automatic conflict resolution
- Configurable sync rules per system

### 🗺️ Dynamic Field Mapping
- JSON-based field mappings
- No code changes required to add fields
- Support for nested objects and arrays

### 🔧 Extensible Architecture
- Easy to add new systems via configuration
- Plugin-based adapter system
- Custom transformation functions

### 📊 Complete Audit Trail
- Every sync operation is logged
- Track success/failure rates
- Retry failed syncs

### 🎯 Type Safety
- Strong typing via universal entity types
- Validation at ingestion
- Schema evolution support

### ⚡ Performance
- Batch processing support
- Configurable batch sizes
- Parallel sync operations

## Configuration

### Adding a New System

To add support for a new software system, add it to `config/universalSchemaRegistry.json`:

```json
{
  "systems": {
    "YourSystem": {
      "displayName": "Your System Name",
      "type": "crm",
      "enabled": true,
      "entities": {
        "Contact": {
          "primaryKey": "id",
          "universalType": "Person",
          "fields": {
            "id": { "type": "string", "universal": "externalId" },
            "name": { "type": "string", "universal": "name" },
            "email": { "type": "string", "universal": "email" }
          }
        }
      }
    }
  }
}
```

### Adding a New Universal Type

Define new universal types in the registry:

```json
{
  "universalTypes": {
    "Project": {
      "description": "Project or initiative",
      "coreFields": ["externalId", "name", "status", "owner"],
      "extendedFields": ["description", "startDate", "endDate", "budget"]
    }
  }
}
```

## API Reference

### SyncToUniversal

Sync an entity from any source system to the universal model.

**Request:**
```protobuf
message UniversalSyncRequest {
  string sourceSystem = 1;      // e.g., "Salesforce"
  string entityType = 2;         // e.g., "Contact"
  string sourceEntityId = 3;     // ID in source system
  string sourceData = 4;         // JSON-encoded entity data
}
```

**Response:**
```protobuf
message UniversalSyncResponse {
  bool success = 1;
  string message = 2;
  string universalEntityId = 3;
  string universalType = 4;
  string data = 5;               // JSON-encoded universal entity
}
```

### MapToSystem

Map a universal entity to a target system format.

**Request:**
```protobuf
message MapToSystemRequest {
  string universalEntityId = 1;
  string targetSystem = 2;       // e.g., "HubSpot"
  string targetEntityType = 3;   // e.g., "Contact"
}
```

### SyncToAllSystems

Automatically sync a universal entity to all compatible systems.

**Request:**
```protobuf
message SyncToAllRequest {
  string universalEntityId = 1;
}
```

**Response:** Streaming of sync results for each target system.

### QueryEntities

Query universal entities with filters.

**Request:**
```protobuf
message QueryEntitiesRequest {
  string universalType = 1;      // Optional filter
  string sourceSystem = 2;       // Optional filter
  string syncStatus = 3;         // Optional filter
  int32 limit = 4;
  int32 offset = 5;
}
```

### GetSupportedSystems

Get list of all supported software systems.

### GetUniversalTypes

Get list of all universal entity types.

### GetIntegrationStatistics

Get comprehensive statistics about the integration.

## Database Schema

### UniversalEntity

Stores normalized entities from all systems:

```prisma
model UniversalEntity {
  id                String      @id @default(uuid())
  universalType     String      // Person, Organization, etc.
  sourceSystem      String      // Salesforce, SAP, etc.
  sourceEntityType  String      // Contact, Account, etc.
  sourceEntityId    String      // ID in source system
  
  coreData          String      // JSON with core fields
  extendedData      String?     // JSON with extended fields
  rawData           String?     // Original data
  
  syncStatus        SyncStatus
  lastSyncedAt      DateTime?
  
  mappings          EntityMapping[]
  syncLogs          UniversalSyncLog[]
}
```

### EntityMapping

Maps universal entities to target systems:

```prisma
model EntityMapping {
  id                  String      @id @default(uuid())
  universalEntityId   String
  
  targetSystem        String      // System being mapped to
  targetEntityType    String      // Entity type in target
  targetEntityId      String?     // ID once created
  
  mappingConfig       String      // JSON with field mappings
  syncStatus          SyncStatus
}
```

### UniversalSyncLog

Complete audit trail of all sync operations:

```prisma
model UniversalSyncLog {
  id                  String      @id @default(uuid())
  universalEntityId   String?
  
  operation           String      // create, update, delete, sync
  sourceSystem        String
  targetSystem        String
  
  syncStatus          SyncStatus
  errorMessage        String?
  retryCount          Int
}
```

## Use Cases

### Use Case 1: Customer Data Hub

Synchronize customer data across all systems:

1. Customer signs up in **Shopify** (e-commerce)
2. Universal entity created with type "Person"
3. Automatically synced to:
   - **Salesforce** as Contact
   - **HubSpot** as Contact
   - **Stripe** as Customer
   - **Slack** for team notification
   - **Microsoft 365** for email communication

### Use Case 2: Financial Data Consolidation

Keep financial data in sync:

1. Invoice created in **QuickBooks**
2. Universal entity created with type "Invoice"
3. Synced to:
   - **GnuCash** for local backup
   - **Xero** for multi-currency support
   - **SAP** for ERP integration

### Use Case 3: Product Catalog Management

Maintain consistent product data:

1. Product created in **Shopify**
2. Universal entity created with type "Product"
3. Synced to:
   - **SAP** as Material
   - **Salesforce** as Product
   - **QuickBooks** as Inventory Item

## Migration Guide

### From QuickBooks-GnuCash to Universal Model

Existing QB-GnuCash integrations continue to work unchanged. To migrate:

1. **Enable Universal Integration:**
   ```javascript
   await client.SyncToUniversal({
     sourceSystem: "QuickBooks",
     entityType: "Class",
     sourceEntityId: classId,
     sourceData: JSON.stringify(classData)
   });
   ```

2. **Query existing entities:**
   ```javascript
   const qbEntities = await client.QueryEntities({
     sourceSystem: "QuickBooks",
     limit: 100
   });
   ```

3. **Sync to additional systems:**
   ```javascript
   await client.SyncToAllSystems({
     universalEntityId: entity.id
   });
   ```

## Performance Considerations

- **Batch Processing:** Use `BatchSyncToUniversal` for bulk operations
- **Async Operations:** Syncing happens in background for non-blocking
- **Configurable Batch Sizes:** Default 10, adjust per system capabilities
- **Retry Logic:** Automatic retry with exponential backoff
- **Caching:** Universal entities cached for fast cross-system lookups

## Security

- **Data Encryption:** All credential data encrypted at rest
- **OAuth 2.0 Support:** First-class support for OAuth flows
- **API Key Management:** Secure storage of API keys
- **Access Control:** Per-system access controls
- **Audit Trail:** Complete logging of all data access

## Future Enhancements

- [ ] Real-time sync via webhooks
- [ ] Conflict resolution UI
- [ ] Data transformation functions (JavaScript/Python)
- [ ] GraphQL API for querying
- [ ] Machine learning for field mapping suggestions
- [ ] Support for 50+ additional systems
- [ ] Mobile SDKs for iOS/Android
- [ ] Web-based configuration UI
- [ ] Advanced reporting and analytics
- [ ] Multi-tenant support

## Conclusion

The Universal Integration Framework transforms QB2GC from a single-purpose integration into a **universal integration platform** capable of connecting **any software system to any other software system** automatically and persistently. 

By defining universal entity types and using dynamic field mapping, we've created a scalable architecture that grows with your business needs without requiring code changes.

---

**Version:** 2.0.0  
**Status:** Production Ready  
**License:** ISC
