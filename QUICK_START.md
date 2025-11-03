# Universal Integration Framework - Quick Start Guide

## What Is This?

QB2GC v2.0 is a **Universal Integration Platform** that can automatically sync data between **ANY software system** through a centralized universal data model.

## 🚀 In 60 Seconds

### What It Does

```
Salesforce Contact → Universal Person → HubSpot Contact
                                    ↓
                            Microsoft 365 User
                                    ↓
                              Slack User
                                    ↓
                            Shopify Customer
```

**One API call syncs a contact to ALL compatible systems automatically!**

## Supported Systems (10+)

✅ QuickBooks Online  
✅ GnuCash  
✅ Salesforce  
✅ HubSpot  
✅ SAP  
✅ Shopify  
✅ Stripe  
✅ Xero  
✅ Microsoft 365  
✅ Slack  

**Want more?** Add any system in minutes via JSON config!

## Universal Entity Types (11)

- **Person** - Customers, contacts, employees
- **Organization** - Companies, accounts
- **Product** - Items, SKUs, catalog entries
- **FinancialAccount** - Bank accounts, GL accounts
- **Order** - Sales orders, purchase orders
- **Invoice** - Bills, invoices
- **Transaction** - Payments, charges
- **Deal** - Opportunities, leads
- **TaxCode** - Tax rates, tax rules
- **OrganizationalUnit** - Departments, teams
- **Group** - User groups, teams

## Quick Examples

### Example 1: Sync Salesforce Contact

```javascript
// Sync a Salesforce contact to universal model
await client.SyncToUniversal({
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
```

**Result:** Universal "Person" entity created

### Example 2: Auto-Sync to All Systems

```javascript
// Automatically sync to ALL compatible systems
await client.SyncToAllSystems({
  universalEntityId: "universal-entity-id-here"
});
```

**Result:** John Doe now exists in Salesforce, HubSpot, Microsoft 365, Slack, Shopify, and Stripe!

### Example 3: Query Universal Entities

```javascript
// Find all Person entities from Salesforce
const entities = await client.QueryEntities({
  universalType: "Person",
  sourceSystem: "Salesforce",
  limit: 100
});
```

## How It Works

### 1. Define Once
Add your system to `config/universalSchemaRegistry.json`:

```json
{
  "YourSystem": {
    "displayName": "Your System",
    "type": "crm",
    "entities": {
      "Contact": {
        "universalType": "Person",
        "fields": {
          "email": { "type": "string", "universal": "email" },
          "name": { "type": "string", "universal": "name" }
        }
      }
    }
  }
}
```

### 2. Use Everywhere
```javascript
await client.SyncToUniversal({
  sourceSystem: "YourSystem",
  entityType: "Contact",
  sourceEntityId: "123",
  sourceData: JSON.stringify({ email: "...", name: "..." })
});
```

### 3. Auto-Sync
The framework automatically:
- Normalizes data to universal format
- Maps to all compatible systems
- Handles field transformations
- Logs all operations
- Retries on failures

## Installation

### Prerequisites
- Node.js 14+
- PostgreSQL 12+

### Setup

```bash
# 1. Clone repository
git clone https://github.com/cogpy/QB2GC.git
cd QB2GC

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 4. Run migrations
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate

# 6. Start server
npm run dev
```

Server runs on `localhost:50051`

## gRPC API

### Available Services

**UniversalIntegration Service:**
- `SyncToUniversal` - Sync entity from any system
- `BatchSyncToUniversal` - Batch sync entities
- `MapToSystem` - Map to target system
- `SyncToAllSystems` - Auto-sync to all systems
- `QueryEntities` - Query universal entities
- `GetSupportedSystems` - List supported systems
- `GetUniversalTypes` - List universal types
- `GetIntegrationStatistics` - Get statistics

**Traditional Services (Still Available):**
- Accounting Service
- TaxationService  
- GnuCashSync Service

## Use Cases

### Use Case 1: Customer Data Hub
Sync customer data across all systems:
- Customer signs up in Shopify
- Automatically synced to Salesforce, HubSpot, Stripe
- Update in any system propagates everywhere

### Use Case 2: Financial Consolidation
Keep accounting data in sync:
- Invoice in QuickBooks
- Synced to GnuCash, Xero, SAP
- Single source of truth

### Use Case 3: Product Catalog
Maintain consistent product data:
- Product in Shopify
- Synced to SAP, Salesforce, QuickBooks
- Price updates propagate instantly

## Adding New Systems

**Time Required:** 5 minutes

**Steps:**
1. Add system config to `universalSchemaRegistry.json`
2. Map entity types to universal types
3. Define field mappings
4. Done! No code changes needed.

**Example:** See `ADDING_SYSTEMS.md` for detailed guide

## Documentation

📚 **Complete Guides:**

- **UNIVERSAL_INTEGRATION.md** - Architecture deep-dive
- **ADDING_SYSTEMS.md** - Add new software systems  
- **DATABASE_MIGRATION.md** - Database setup
- **IMPLEMENTATION_COMPLETE.md** - Implementation summary

📝 **Example Code:**
- `src/examples/universalIntegrationExample.js` - 9 complete examples

## Benefits

### For Developers
✅ Rapid integration (minutes, not weeks)  
✅ Type-safe universal model  
✅ No vendor lock-in  
✅ Clear abstractions  

### For Business
✅ Unified data across all systems  
✅ Instant cross-system integration  
✅ Reduced integration costs  
✅ Unlimited scalability  

### For Operations
✅ Complete audit trail  
✅ Automatic error recovery  
✅ Real-time monitoring  
✅ Centralized data quality  

## Architecture

```
┌─────────────────────────────────────────────┐
│     UNIVERSAL INTEGRATION LAYER             │
│  - Schema Registry (10+ Systems)            │
│  - Universal Entity Database                │
│  - Dynamic Field Mapping                    │
│  - Cross-System Sync                        │
└─────────────────┬───────────────────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│   CRM   │  │   ERP   │  │E-Commerce│
│Systems  │  │Systems  │  │ Systems │
└─────────┘  └─────────┘  └─────────┘
     ▼            ▼            ▼
  Salesforce    SAP        Shopify
  HubSpot       QuickBooks  Stripe
```

## Key Features

🔄 **Bidirectional Sync** - Data flows both ways  
🗺️ **Dynamic Mapping** - JSON-based field mappings  
🔧 **Extensible** - Add unlimited systems  
📊 **Observable** - Complete audit trail  
🎯 **Type Safe** - Strong typing via universal types  
⚡ **Performant** - Batch processing, parallel sync  

## FAQ

**Q: Does this replace existing integrations?**  
A: No! All existing QB/GnuCash functionality works unchanged. Universal integration is additive.

**Q: How do I add a new system?**  
A: Edit `universalSchemaRegistry.json` with your system config. No code changes needed!

**Q: What if my system has custom fields?**  
A: Define them in the schema registry. The framework handles arbitrary fields via JSON.

**Q: Can I sync bidirectionally?**  
A: Yes! Data can flow in both directions. Configure sync direction per system.

**Q: How is data transformed between systems?**  
A: The framework applies transformations defined in the schema registry (type conversions, mappings, etc.)

**Q: What about security?**  
A: Credentials are stored encrypted. OAuth 2.0 supported. Complete audit trail for compliance.

## Support & Resources

📖 Read the docs: See documentation files in repository  
💻 Try examples: `src/examples/universalIntegrationExample.js`  
🐛 Report issues: GitHub Issues  

## Next Steps

1. ✅ Read `UNIVERSAL_INTEGRATION.md` for architecture details
2. ✅ Try the example client to see it in action
3. ✅ Add your first system using `ADDING_SYSTEMS.md`
4. ✅ Set up database with `DATABASE_MIGRATION.md`

## Success!

You now have a universal integration platform that can connect **ANY software system** to **ANY other system** automatically and persistently!

---

**Version:** 2.0.0  
**Status:** Production Ready  
**License:** ISC
