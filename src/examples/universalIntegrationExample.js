import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, '../hello.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const helloPackage = protoDescriptor.hello;

// Create gRPC client
const client = new helloPackage.UniversalIntegration(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

/**
 * Example 1: Sync a Salesforce Contact to Universal Model
 */
async function example1_SyncSalesforceContact() {
  console.log('\n📊 Example 1: Sync Salesforce Contact to Universal Model\n');

  const salesforceContact = {
    Id: '003xx000004TmiH',
    FirstName: 'John',
    LastName: 'Doe',
    Email: 'john.doe@example.com',
    Phone: '+1-555-0100',
    Title: 'VP of Sales'
  };

  return new Promise((resolve, reject) => {
    client.SyncToUniversal({
      sourceSystem: 'Salesforce',
      entityType: 'Contact',
      sourceEntityId: salesforceContact.Id,
      sourceData: JSON.stringify(salesforceContact)
    }, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log('✅ Success:', response.message);
        console.log('🆔 Universal Entity ID:', response.universalEntityId);
        console.log('🏷️  Universal Type:', response.universalType);
        console.log('📦 Data:', JSON.parse(response.data));
        resolve(response);
      }
    });
  });
}

/**
 * Example 2: Sync a SAP Business Partner
 */
async function example2_SyncSAPBusinessPartner() {
  console.log('\n📊 Example 2: Sync SAP Business Partner\n');

  const sapBusinessPartner = {
    BusinessPartner: '1000001',
    BusinessPartnerName: 'Acme Corporation',
    BusinessPartnerCategory: '2',
    Country: 'US'
  };

  return new Promise((resolve, reject) => {
    client.SyncToUniversal({
      sourceSystem: 'SAP',
      entityType: 'BusinessPartner',
      sourceEntityId: sapBusinessPartner.BusinessPartner,
      sourceData: JSON.stringify(sapBusinessPartner)
    }, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log('✅ Success:', response.message);
        console.log('🆔 Universal Entity ID:', response.universalEntityId);
        console.log('🏷️  Universal Type:', response.universalType);
        resolve(response);
      }
    });
  });
}

/**
 * Example 3: Map Universal Entity to HubSpot
 */
async function example3_MapToHubSpot(universalEntityId) {
  console.log('\n📊 Example 3: Map Universal Entity to HubSpot\n');

  return new Promise((resolve, reject) => {
    client.MapToSystem({
      universalEntityId: universalEntityId,
      targetSystem: 'HubSpot',
      targetEntityType: 'Contact'
    }, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log('✅ Success:', response.message);
        console.log('🗺️  Mapping ID:', response.mappingId);
        console.log('📦 Target Data:', JSON.parse(response.targetData));
        resolve(response);
      }
    });
  });
}

/**
 * Example 4: Sync to All Compatible Systems
 */
async function example4_SyncToAllSystems(universalEntityId) {
  console.log('\n📊 Example 4: Sync to All Compatible Systems\n');

  return new Promise((resolve, reject) => {
    const call = client.SyncToAllSystems({ universalEntityId });
    
    const results = [];
    
    call.on('data', (response) => {
      console.log(`${response.success ? '✅' : '❌'} ${response.targetSystem} (${response.targetEntityType}): ${response.message}`);
      results.push(response);
    });

    call.on('end', () => {
      console.log(`\n📊 Total systems synced: ${results.length}`);
      resolve(results);
    });

    call.on('error', (error) => {
      console.error('❌ Stream error:', error.message);
      reject(error);
    });
  });
}

/**
 * Example 5: Query Universal Entities
 */
async function example5_QueryEntities() {
  console.log('\n📊 Example 5: Query Universal Entities\n');

  return new Promise((resolve, reject) => {
    client.QueryEntities({
      universalType: 'Person',
      limit: 10,
      offset: 0
    }, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log('✅ Success:', response.message);
        console.log('📊 Total:', response.total);
        const entities = JSON.parse(response.data);
        console.log('📦 Entities:');
        entities.forEach((entity, index) => {
          console.log(`  ${index + 1}. ${entity.universalType} from ${entity.sourceSystem} (ID: ${entity.id})`);
        });
        resolve(response);
      }
    });
  });
}

/**
 * Example 6: Get Supported Systems
 */
async function example6_GetSupportedSystems() {
  console.log('\n📊 Example 6: Get Supported Systems\n');

  return new Promise((resolve, reject) => {
    client.GetSupportedSystems({}, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log(`✅ Total supported systems: ${response.total}\n`);
        response.systems.forEach((system, index) => {
          console.log(`${index + 1}. ${system.displayName} (${system.name})`);
          console.log(`   Type: ${system.type}`);
          console.log(`   Enabled: ${system.enabled}`);
          console.log(`   Entities: ${system.entities.join(', ')}`);
          console.log('');
        });
        resolve(response);
      }
    });
  });
}

/**
 * Example 7: Get Universal Types
 */
async function example7_GetUniversalTypes() {
  console.log('\n📊 Example 7: Get Universal Types\n');

  return new Promise((resolve, reject) => {
    client.GetUniversalTypes({}, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log(`✅ Total universal types: ${response.total}\n`);
        response.types.forEach((type, index) => {
          console.log(`${index + 1}. ${type.name}`);
          console.log(`   Description: ${type.description}`);
          console.log(`   Core Fields: ${type.coreFields.join(', ')}`);
          console.log(`   Extended Fields: ${type.extendedFields.join(', ')}`);
          console.log('');
        });
        resolve(response);
      }
    });
  });
}

/**
 * Example 8: Get Integration Statistics
 */
async function example8_GetStatistics() {
  console.log('\n📊 Example 8: Get Integration Statistics\n');

  return new Promise((resolve, reject) => {
    client.GetIntegrationStatistics({}, (error, response) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
      } else {
        console.log('✅ Success:', response.message);
        const stats = JSON.parse(response.data);
        console.log('\n📊 Overview:');
        console.log(`   Total Universal Entities: ${stats.overview.totalUniversalEntities}`);
        console.log(`   Total Mappings: ${stats.overview.totalMappings}`);
        console.log(`   Total Sync Operations: ${stats.overview.totalSyncOperations}`);
        console.log(`   Enabled Systems: ${stats.overview.enabledSystems}`);
        resolve(response);
      }
    });
  });
}

/**
 * Example 9: Batch Sync Multiple Entities
 */
async function example9_BatchSync() {
  console.log('\n📊 Example 9: Batch Sync Multiple Entities\n');

  const entities = [
    {
      sourceSystem: 'Shopify',
      entityType: 'Customer',
      sourceEntityId: '1001',
      sourceData: JSON.stringify({
        id: '1001',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        phone: '+1-555-0200'
      })
    },
    {
      sourceSystem: 'Shopify',
      entityType: 'Customer',
      sourceEntityId: '1002',
      sourceData: JSON.stringify({
        id: '1002',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@example.com',
        phone: '+1-555-0300'
      })
    },
    {
      sourceSystem: 'Stripe',
      entityType: 'Customer',
      sourceEntityId: 'cus_123',
      sourceData: JSON.stringify({
        id: 'cus_123',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        phone: '+1-555-0400'
      })
    }
  ];

  return new Promise((resolve, reject) => {
    const call = client.BatchSyncToUniversal();

    call.on('data', (response) => {
      console.log(`✅ Batch completed: ${response.successful} successful, ${response.failed} failed`);
      console.log(`   ${response.message}`);
      resolve(response);
    });

    call.on('error', (error) => {
      console.error('❌ Stream error:', error.message);
      reject(error);
    });

    // Send all entities
    entities.forEach(entity => {
      console.log(`📤 Sending: ${entity.sourceSystem} ${entity.entityType} ${entity.sourceEntityId}`);
      call.write(entity);
    });

    call.end();
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🌐 Universal Integration Framework - Example Client');
  console.log('='.repeat(60));

  try {
    // Example 6: List supported systems
    await example6_GetSupportedSystems();

    // Example 7: List universal types
    await example7_GetUniversalTypes();

    // Example 1: Sync Salesforce Contact
    const response1 = await example1_SyncSalesforceContact();
    const universalEntityId = response1.universalEntityId;

    // Example 2: Sync SAP Business Partner
    await example2_SyncSAPBusinessPartner();

    // Example 3: Map to HubSpot
    await example3_MapToHubSpot(universalEntityId);

    // Example 4: Sync to all systems
    await example4_SyncToAllSystems(universalEntityId);

    // Example 5: Query entities
    await example5_QueryEntities();

    // Example 8: Get statistics
    await example8_GetStatistics();

    // Example 9: Batch sync
    await example9_BatchSync();

    console.log('\n✅ All examples completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error in examples:', error);
  }
}

// Run examples
main();
