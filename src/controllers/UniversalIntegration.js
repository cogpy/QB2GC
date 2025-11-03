import UniversalIntegrationService from '../services/UniversalIntegrationService.js';

// Initialize service
const universalService = new UniversalIntegrationService();

/**
 * Universal Integration gRPC Controller
 * 
 * Provides gRPC endpoints for integrating ANY software system
 * with the universal data model.
 */

/**
 * Sync entity from any system to universal model
 */
export async function SyncToUniversal(call, callback) {
  try {
    const { sourceSystem, entityType, sourceEntityId, sourceData } = call.request;

    if (!sourceSystem || !entityType || !sourceEntityId || !sourceData) {
      return callback({
        code: 3, // INVALID_ARGUMENT
        message: 'Missing required fields: sourceSystem, entityType, sourceEntityId, sourceData'
      });
    }

    // Parse source data
    let parsedData;
    try {
      parsedData = JSON.parse(sourceData);
    } catch (error) {
      return callback({
        code: 3,
        message: 'Invalid JSON in sourceData field'
      });
    }

    // Sync to universal
    const universalEntity = await universalService.syncEntityToUniversal(
      sourceSystem,
      entityType,
      sourceEntityId,
      parsedData
    );

    callback(null, {
      success: true,
      message: `✅ Synced ${sourceSystem} ${entityType} to universal model`,
      universalEntityId: universalEntity.id,
      universalType: universalEntity.universalType,
      data: JSON.stringify({
        id: universalEntity.id,
        universalType: universalEntity.universalType,
        coreData: JSON.parse(universalEntity.coreData),
        extendedData: universalEntity.extendedData ? JSON.parse(universalEntity.extendedData) : {}
      })
    });

  } catch (error) {
    console.error('❌ Error in SyncToUniversal:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message
    });
  }
}

/**
 * Batch sync entities to universal model
 */
export async function BatchSyncToUniversal(call) {
  const entities = [];
  
  call.on('data', (request) => {
    entities.push(request);
  });

  call.on('end', async () => {
    let successful = 0;
    let failed = 0;

    for (const entity of entities) {
      try {
        const { sourceSystem, entityType, sourceEntityId, sourceData } = entity;
        const parsedData = JSON.parse(sourceData);
        
        await universalService.syncEntityToUniversal(
          sourceSystem,
          entityType,
          sourceEntityId,
          parsedData
        );
        
        successful++;
      } catch (error) {
        console.error(`❌ Failed to sync entity:`, error);
        failed++;
      }
    }

    call.write({
      total: entities.length,
      successful,
      failed,
      message: `✅ Batch sync completed: ${successful} successful, ${failed} failed`
    });

    call.end();
  });

  call.on('error', (error) => {
    console.error('❌ Stream error in BatchSyncToUniversal:', error);
  });
}

/**
 * Map universal entity to target system
 */
export async function MapToSystem(call, callback) {
  try {
    const { universalEntityId, targetSystem, targetEntityType } = call.request;

    if (!universalEntityId || !targetSystem || !targetEntityType) {
      return callback({
        code: 3,
        message: 'Missing required fields: universalEntityId, targetSystem, targetEntityType'
      });
    }

    const result = await universalService.mapToTargetSystem(
      universalEntityId,
      targetSystem,
      targetEntityType
    );

    callback(null, {
      success: true,
      message: `✅ Mapped universal entity to ${targetSystem} ${targetEntityType}`,
      mappingId: result.mapping.id,
      targetData: JSON.stringify(result.targetData)
    });

  } catch (error) {
    console.error('❌ Error in MapToSystem:', error);
    callback({
      code: 13,
      message: error.message
    });
  }
}

/**
 * Sync universal entity to all configured systems
 */
export async function SyncToAllSystems(call) {
  try {
    const { universalEntityId } = call.request;

    if (!universalEntityId) {
      call.emit('error', {
        code: 3,
        message: 'Missing required field: universalEntityId'
      });
      return;
    }

    const results = await universalService.syncToAllSystems(universalEntityId);

    // Stream results back
    for (const result of results) {
      call.write({
        targetSystem: result.system,
        targetEntityType: result.entityType,
        success: result.success,
        message: result.success 
          ? `✅ Synced to ${result.system}`
          : `❌ Failed: ${result.error}`
      });
    }

    call.end();

  } catch (error) {
    console.error('❌ Error in SyncToAllSystems:', error);
    call.emit('error', {
      code: 13,
      message: error.message
    });
  }
}

/**
 * Query universal entities
 */
export async function QueryEntities(call, callback) {
  try {
    const filters = {
      universalType: call.request.universalType || undefined,
      sourceSystem: call.request.sourceSystem || undefined,
      syncStatus: call.request.syncStatus || undefined,
      limit: call.request.limit || 100,
      offset: call.request.offset || 0
    };

    const entities = await universalService.findEntities(filters);

    // Convert to simple format for response
    const simplifiedEntities = entities.map(e => ({
      id: e.id,
      universalType: e.universalType,
      sourceSystem: e.sourceSystem,
      sourceEntityType: e.sourceEntityType,
      sourceEntityId: e.sourceEntityId,
      coreData: JSON.parse(e.coreData),
      extendedData: e.extendedData ? JSON.parse(e.extendedData) : {},
      syncStatus: e.syncStatus,
      lastSyncedAt: e.lastSyncedAt?.toISOString(),
      createdAt: e.createdAt.toISOString()
    }));

    callback(null, {
      message: `✅ Found ${entities.length} entities`,
      data: JSON.stringify(simplifiedEntities),
      total: entities.length
    });

  } catch (error) {
    console.error('❌ Error in QueryEntities:', error);
    callback({
      code: 13,
      message: error.message
    });
  }
}

/**
 * Get supported systems
 */
export async function GetSupportedSystems(call, callback) {
  try {
    const systems = universalService.getSupportedSystems();

    callback(null, {
      systems: systems.map(s => ({
        name: s.name,
        displayName: s.displayName,
        type: s.type,
        enabled: s.enabled,
        entities: s.entities
      })),
      total: systems.length
    });

  } catch (error) {
    console.error('❌ Error in GetSupportedSystems:', error);
    callback({
      code: 13,
      message: error.message
    });
  }
}

/**
 * Get universal types
 */
export async function GetUniversalTypes(call, callback) {
  try {
    const types = universalService.getUniversalTypes();

    callback(null, {
      types: types.map(t => ({
        name: t.name,
        description: t.description,
        coreFields: t.coreFields,
        extendedFields: t.extendedFields
      })),
      total: types.length
    });

  } catch (error) {
    console.error('❌ Error in GetUniversalTypes:', error);
    callback({
      code: 13,
      message: error.message
    });
  }
}

/**
 * Get integration statistics
 */
export async function GetIntegrationStatistics(call, callback) {
  try {
    const stats = await universalService.getStatistics();

    callback(null, {
      message: '✅ Integration statistics retrieved',
      data: JSON.stringify(stats, null, 2)
    });

  } catch (error) {
    console.error('❌ Error in GetIntegrationStatistics:', error);
    callback({
      code: 13,
      message: error.message
    });
  }
}

// Initialize the service
export async function initializeUniversalIntegration() {
  await universalService.initialize();
  return universalService;
}

export { universalService };
