import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, '../hello.proto');

// Load proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const hello_proto = grpc.loadPackageDefinition(packageDefinition).hello;

/**
 * Example: Sync a class to GnuCash
 */
async function syncClassToGnuCash(classId) {
  const client = new hello_proto.GnuCashSync(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );

  return new Promise((resolve, reject) => {
    client.SyncClassToGnuCash({ classId }, (error, response) => {
      if (error) {
        console.error('Error syncing class:', error);
        reject(error);
      } else {
        console.log('✅ Sync Response:', response);
        resolve(response);
      }
    });
  });
}

/**
 * Example: Batch sync classes to GnuCash
 */
async function batchSyncClasses(classIds) {
  const client = new hello_proto.GnuCashSync(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );

  const call = client.BatchSyncClassesToGnuCash();

  return new Promise((resolve, reject) => {
    const results = [];

    call.on('data', (response) => {
      console.log('📊 Batch Sync Progress:', response);
      results.push(response);
    });

    call.on('end', () => {
      console.log('✅ Batch sync completed');
      resolve(results);
    });

    call.on('error', (error) => {
      console.error('❌ Batch sync error:', error);
      reject(error);
    });

    // Send class IDs
    classIds.forEach(classId => {
      call.write({ classId });
    });

    call.end();
  });
}

/**
 * Example: Get sync statistics
 */
async function getSyncStatistics() {
  const client = new hello_proto.GnuCashSync(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );

  return new Promise((resolve, reject) => {
    client.GetSyncStatistics({}, (error, response) => {
      if (error) {
        console.error('Error getting statistics:', error);
        reject(error);
      } else {
        console.log('📊 Sync Statistics:', JSON.parse(response.data));
        resolve(response);
      }
    });
  });
}

/**
 * Example: Create classes (auto-syncs to QB and GnuCash)
 */
async function createClasses() {
  const client = new hello_proto.Accounting(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );

  const call = client.CreateClass();

  return new Promise((resolve, reject) => {
    const results = [];

    call.on('data', (response) => {
      console.log('✅ Classes Created:', response);
      results.push(response);
    });

    call.on('end', () => {
      console.log('✅ All classes created');
      resolve(results);
    });

    call.on('error', (error) => {
      console.error('❌ Error creating classes:', error);
      reject(error);
    });

    // Send sample classes
    call.write({
      classes: [
        {
          qb_id: '',
          name: 'Engineering',
          full_name: 'Company / Engineering',
          is_sub_class: true,
          is_active: true,
          domain_source: 'QBO',
          version_token: 0,
          is_sparse: false
        },
        {
          qb_id: '',
          name: 'Marketing',
          full_name: 'Company / Marketing',
          is_sub_class: true,
          is_active: true,
          domain_source: 'QBO',
          version_token: 0,
          is_sparse: false
        }
      ]
    });

    call.end();
  });
}

// Example usage
async function main() {
  console.log('🚀 QB2GC Example Client\n');

  try {
    // Example 1: Get sync statistics
    console.log('\n📊 Example 1: Get Sync Statistics');
    console.log('─'.repeat(50));
    await getSyncStatistics();

    // Example 2: Create classes (auto-syncs to GnuCash)
    console.log('\n📝 Example 2: Create Classes (Auto-sync)');
    console.log('─'.repeat(50));
    console.log('Note: This will sync to QuickBooks Online first,');
    console.log('then automatically sync to GnuCash in the background.\n');
    
    // Uncomment to test:
    // const createResult = await createClasses();
    // console.log('Created IDs:', createResult[0].ids);

    // Example 3: Manual sync of a specific class
    console.log('\n🔄 Example 3: Manual Sync to GnuCash');
    console.log('─'.repeat(50));
    console.log('Usage: syncClassToGnuCash("class-uuid-here")\n');
    
    // Uncomment to test with a real class ID:
    // await syncClassToGnuCash('your-class-uuid-here');

    // Example 4: Batch sync
    console.log('\n📦 Example 4: Batch Sync to GnuCash');
    console.log('─'.repeat(50));
    console.log('Usage: batchSyncClasses(["uuid1", "uuid2", "uuid3"])\n');
    
    // Uncomment to test with real class IDs:
    // await batchSyncClasses(['uuid1', 'uuid2']);

  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Export functions for use in other modules
export {
  syncClassToGnuCash,
  batchSyncClasses,
  getSyncStatistics,
  createClasses
};
