# Adding New Systems to Universal Integration Framework

## Quick Start Guide

This guide explains how to add support for **any new software system** to the Universal Integration Framework.

## Step 1: Understand Your System

Before adding integration, gather this information:

1. **System Type:** What category? (CRM, ERP, Accounting, etc.)
2. **Authentication:** OAuth2? API Key? Basic Auth?
3. **API Documentation:** REST? GraphQL? SOAP?
4. **Entity Types:** What objects does it have? (Contact, Account, Order, etc.)
5. **Field Mapping:** What fields exist on each entity?

## Step 2: Add to Schema Registry

Edit `config/universalSchemaRegistry.json`:

```json
{
  "systems": {
    "YourSystemName": {
      "displayName": "Your System Display Name",
      "type": "crm|erp|accounting|ecommerce|etc",
      "enabled": true,
      "entities": {
        "EntityType1": {
          "primaryKey": "id",
          "universalType": "Person|Organization|Product|etc",
          "fields": {
            "sourceField1": {
              "type": "string|boolean|decimal|date|etc",
              "universal": "universalFieldName"
            }
          }
        }
      }
    }
  }
}
```

### Example: Adding Zendesk Support

```json
{
  "systems": {
    "Zendesk": {
      "displayName": "Zendesk Support",
      "type": "support",
      "enabled": true,
      "entities": {
        "User": {
          "primaryKey": "id",
          "universalType": "Person",
          "fields": {
            "id": { "type": "string", "universal": "externalId" },
            "name": { "type": "string", "universal": "name" },
            "email": { "type": "string", "universal": "email" },
            "phone": { "type": "string", "universal": "phone" },
            "role": { "type": "string", "universal": "jobTitle" }
          }
        },
        "Ticket": {
          "primaryKey": "id",
          "universalType": "Issue",
          "fields": {
            "id": { "type": "string", "universal": "externalId" },
            "subject": { "type": "string", "universal": "title" },
            "description": { "type": "string", "universal": "description" },
            "status": { "type": "string", "universal": "status" },
            "priority": { "type": "string", "universal": "priority" }
          }
        }
      }
    }
  }
}
```

## Step 3: Map to Universal Type

Choose the most appropriate universal type for each entity:

| Source Entity | Best Universal Type |
|--------------|-------------------|
| Contact, User, Customer, Employee | Person |
| Account, Company, Organization | Organization |
| Item, SKU, Catalog Entry | Product |
| Bank Account, GL Account | FinancialAccount |
| Department, Team, Division | OrganizationalUnit |
| Sales Order, Purchase Order | Order |
| Bill, Invoice | Invoice |
| Payment, Charge, Transfer | Transaction |
| Opportunity, Lead | Deal |
| Tax Rate, Tax Code | TaxCode |
| User Group, Team | Group |

### Need a New Universal Type?

If none fit, add a new universal type to the registry:

```json
{
  "universalTypes": {
    "Issue": {
      "description": "Support ticket or issue",
      "coreFields": ["externalId", "title", "description", "status"],
      "extendedFields": ["priority", "assignee", "createdAt", "resolvedAt"]
    }
  }
}
```

## Step 4: Configure Authentication

Add system connection config to database:

```javascript
// Using Prisma client
await prisma.systemIntegration.create({
  data: {
    systemName: 'Zendesk',
    systemType: 'support',
    enabled: true,
    connectionConfig: JSON.stringify({
      subdomain: 'your-subdomain',
      apiToken: 'encrypted-token',
      email: 'admin@company.com'
    }),
    authType: 'api_key',
    autoSync: false,
    batchSize: 25,
    retryAttempts: 3
  }
});
```

## Step 5: Use the Integration

Once added to the registry, the system is immediately available:

```javascript
// Sync entity from your new system
await client.SyncToUniversal({
  sourceSystem: 'Zendesk',
  entityType: 'User',
  sourceEntityId: '12345',
  sourceData: JSON.stringify({
    id: '12345',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0100',
    role: 'Administrator'
  })
});
```

## Step 6: Create System Adapter (Optional)

For advanced integrations, create a custom adapter:

```javascript
// src/adapters/ZendeskAdapter.js
export class ZendeskAdapter {
  constructor(config) {
    this.subdomain = config.subdomain;
    this.apiToken = config.apiToken;
    this.email = config.email;
  }

  async fetchEntity(entityType, entityId) {
    // Implement API call to fetch entity
    const response = await fetch(
      `https://${this.subdomain}.zendesk.com/api/v2/${entityType}s/${entityId}.json`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.email}/token:${this.apiToken}`).toString('base64')}`
        }
      }
    );
    return response.json();
  }

  async createEntity(entityType, data) {
    // Implement API call to create entity
  }

  async updateEntity(entityType, entityId, data) {
    // Implement API call to update entity
  }
}

// Register adapter
import { universalService } from './controllers/UniversalIntegration.js';
import { ZendeskAdapter } from './adapters/ZendeskAdapter.js';

const zendeskConfig = await getSystemConfig('Zendesk');
const adapter = new ZendeskAdapter(zendeskConfig);
universalService.registerAdapter('Zendesk', adapter);
```

## Common Patterns

### Pattern 1: Simple Field Mapping

```json
{
  "fields": {
    "first_name": { "type": "string", "universal": "firstName" },
    "last_name": { "type": "string", "universal": "lastName" }
  }
}
```

### Pattern 2: Nested Field Access

```json
{
  "fields": {
    "profile.email": { "type": "string", "universal": "email" },
    "profile.phone": { "type": "string", "universal": "phone" }
  }
}
```

### Pattern 3: Type Conversion

```json
{
  "fields": {
    "is_active": { "type": "boolean", "universal": "isActive" },
    "created_timestamp": { "type": "timestamp", "universal": "createdAt" },
    "annual_revenue": { "type": "decimal", "universal": "revenue" }
  }
}
```

### Pattern 4: Enum Mapping

For fields that need value transformation:

```json
{
  "fields": {
    "account_type": {
      "type": "enum",
      "universal": "accountType",
      "mappingRules": {
        "checking": "BANK",
        "savings": "BANK",
        "credit_card": "CREDIT_CARD"
      }
    }
  }
}
```

## Testing Your Integration

### 1. Verify System Registration

```javascript
const systems = await client.GetSupportedSystems({});
console.log(systems); // Should include your new system
```

### 2. Test Entity Sync

```javascript
const result = await client.SyncToUniversal({
  sourceSystem: 'YourSystem',
  entityType: 'YourEntityType',
  sourceEntityId: 'test-123',
  sourceData: JSON.stringify({ /* test data */ })
});

console.log('Success:', result.success);
console.log('Universal ID:', result.universalEntityId);
```

### 3. Test Cross-System Mapping

```javascript
await client.MapToSystem({
  universalEntityId: result.universalEntityId,
  targetSystem: 'Salesforce',
  targetEntityType: 'Contact'
});
```

### 4. Test Auto-Sync

```javascript
await client.SyncToAllSystems({
  universalEntityId: result.universalEntityId
});
```

## Real-World Examples

### Example 1: Jira Integration

```json
{
  "Jira": {
    "displayName": "Jira Software",
    "type": "project_management",
    "enabled": true,
    "entities": {
      "Issue": {
        "primaryKey": "id",
        "universalType": "Task",
        "fields": {
          "id": { "type": "string", "universal": "externalId" },
          "summary": { "type": "string", "universal": "title" },
          "description": { "type": "string", "universal": "description" },
          "status.name": { "type": "string", "universal": "status" },
          "assignee.displayName": { "type": "string", "universal": "assignee" }
        }
      }
    }
  }
}
```

### Example 2: MongoDB Integration

```json
{
  "MongoDB": {
    "displayName": "MongoDB Atlas",
    "type": "database",
    "enabled": true,
    "entities": {
      "User": {
        "primaryKey": "_id",
        "universalType": "Person",
        "fields": {
          "_id": { "type": "string", "universal": "externalId" },
          "username": { "type": "string", "universal": "name" },
          "email": { "type": "string", "universal": "email" },
          "profile.phone": { "type": "string", "universal": "phone" }
        }
      }
    }
  }
}
```

### Example 3: Google Workspace

```json
{
  "GoogleWorkspace": {
    "displayName": "Google Workspace",
    "type": "productivity",
    "enabled": true,
    "entities": {
      "User": {
        "primaryKey": "id",
        "universalType": "Person",
        "fields": {
          "id": { "type": "string", "universal": "externalId" },
          "name.fullName": { "type": "string", "universal": "name" },
          "primaryEmail": { "type": "string", "universal": "email" },
          "organizations[0].title": { "type": "string", "universal": "jobTitle" },
          "organizations[0].department": { "type": "string", "universal": "department" }
        }
      }
    }
  }
}
```

## Advanced Topics

### Custom Transformations

If built-in transformations aren't enough, modify `UniversalIntegrationService.js`:

```javascript
transformValue(value, type) {
  switch (type) {
    case 'phone_normalize':
      // Custom: Normalize phone to E.164 format
      return normalizePhone(value);
    
    case 'currency_convert':
      // Custom: Convert currency
      return convertCurrency(value, 'USD');
    
    default:
      // Fall back to built-in transformations
      return super.transformValue(value, type);
  }
}
```

### Bidirectional Sync

To enable syncing FROM universal back to source:

1. Implement reverse field mapping
2. Create adapter methods for `createEntity` and `updateEntity`
3. Call adapter methods when syncing to target system

### Webhook Support

For real-time sync:

1. Create webhook endpoint in your system
2. Parse incoming webhook payload
3. Call `SyncToUniversal` with the data
4. Universal framework handles the rest

## Troubleshooting

### Issue: Field Not Mapping

**Check:**
- Field path is correct (use dot notation for nested)
- Type transformation is appropriate
- Universal field name matches core/extended fields

### Issue: Sync Failing

**Check:**
- System is enabled in registry
- Entity type exists in system config
- Source data is valid JSON
- Universal type supports the entity

### Issue: Cross-System Sync Not Working

**Check:**
- Both systems support the same universal type
- Target system has entity type for that universal type
- Mapping configuration is complete

## Best Practices

1. **Start Small:** Begin with one entity type
2. **Use Existing Types:** Map to existing universal types when possible
3. **Test Thoroughly:** Verify sync in both directions
4. **Document:** Add comments in schema registry
5. **Version Control:** Track registry changes in git
6. **Monitor:** Use integration statistics to track health

## Getting Help

- Check `UNIVERSAL_INTEGRATION.md` for architecture details
- Review existing system configurations as examples
- Use `GetIntegrationStatistics` to debug sync issues
- Check `UniversalSyncLog` table for error details

## Conclusion

Adding a new system takes **minutes, not days**:

1. Add system config to JSON registry
2. Map entity types to universal types  
3. Define field mappings
4. Test with sample data

No code changes required! The universal framework handles everything automatically.
