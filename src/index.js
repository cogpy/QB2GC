import express from 'express'
import dotenv from 'dotenv'
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
const PROTO_PATH = './src/hello.proto';
import {CreateTaxations,GetTaxationById,UpdateTaxations} from "./controllers/taxations.js"
import {CreateClass} from "./controllers/Class.js"
import { createAccount } from './controllers/Accounting.js';
import {
  initializeGnuCashService,
  SyncClassToGnuCash,
  BatchSyncClassesToGnuCash,
  SyncAccountToGnuCash,
  BatchSyncAccountsToGnuCash,
  GetSyncStatistics
} from './controllers/GnuCashSync.js';
import {
  initializeUniversalIntegration,
  SyncToUniversal,
  BatchSyncToUniversal,
  MapToSystem,
  SyncToAllSystems,
  QueryEntities,
  GetSupportedSystems,
  GetUniversalTypes,
  GetIntegrationStatistics
} from './controllers/UniversalIntegration.js';

dotenv.config()

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const helloPackage = grpcObject.hello;


const sayHello = (call, callback) => {
  const name = call.request.name;
  callback(null, { message: `Hello, ${name}!` });
};

const add = (call,callback) => {
    const num = call.request.number
    const result = num + 2
    callback(null,{result})
}

const idGetter = (call, callback) => {
  const data = [
    { Id: 1, name: 'Yash', age: 22 },
    { Id: 2, name: 'Sakshi', age: 24 },
    { Id: 3, name: 'Rakhes', age: 25 },
    { Id: 4, name: 'Vinay', age: 26 },
  ];

 
  const id = call.request.Id;

  const user = data.find(d => d.Id === id);
  if (!user) {
    return callback({ code: grpc.status.NOT_FOUND, message: 'User not found' });
  }

  // 👇 Ensure this matches `idResponse { info details = 1; }`
  callback(null, { details: { name: user.name, age: user.age } });
};

// Initialize GnuCash service and Universal Integration service
(async () => {
  try {
    await initializeGnuCashService();
    console.log('✅ GnuCash Sync Service initialized');
    
    await initializeUniversalIntegration();
    console.log('✅ Universal Integration Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
})();

// Create a gRPC server
const server = new grpc.Server();

// Add service to the server
server.addService(helloPackage.HelloService.service, { sayHello,add,idGetter });

server.addService(helloPackage.TaxationService.service, {
  CreateTaxations,
  GetTaxationById,
  UpdateTaxations
});

server.addService(helloPackage.Accounting.service,{
  createAccount,
  CreateClass
});

// Add GnuCash Sync Service
server.addService(helloPackage.GnuCashSync.service, {
  SyncClassToGnuCash,
  BatchSyncClassesToGnuCash,
  SyncAccountToGnuCash,
  BatchSyncAccountsToGnuCash,
  GetSyncStatistics
});

// Add Universal Integration Service
server.addService(helloPackage.UniversalIntegration.service, {
  SyncToUniversal,
  BatchSyncToUniversal,
  MapToSystem,
  SyncToAllSystems,
  QueryEntities,
  GetSupportedSystems,
  GetUniversalTypes,
  GetIntegrationStatistics
});

// Start the server
server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('gRPC server running on port 50051');
  console.log('📊 Services available:');
  console.log('  - HelloService');
  console.log('  - TaxationService');
  console.log('  - Accounting');
  console.log('  - GnuCashSync');
  console.log('  - UniversalIntegration ⭐ (NEW)');
  console.log('');
  console.log('🌐 Universal Integration supports:');
  console.log('  - QuickBooks, GnuCash, Salesforce, SAP, Microsoft 365');
  console.log('  - Shopify, HubSpot, Stripe, Xero, Slack');
  console.log('  - And growing! Check GetSupportedSystems for full list');
});

