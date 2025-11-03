import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Universal Integration Service
 * 
 * This service provides a framework for integrating ANY software system
 * with the universal data model. It automatically maps entities from
 * any source system to universal types and enables seamless cross-system
 * synchronization.
 */
export class UniversalIntegrationService {
  constructor() {
    this.schemaRegistry = null;
    this.registryPath = path.join(__dirname, '../../config/universalSchemaRegistry.json');
    this.systemAdapters = new Map();
  }

  /**
   * Initialize the service by loading the universal schema registry
   */
  async initialize() {
    try {
      const registryData = await fs.readFile(this.registryPath, 'utf-8');
      this.schemaRegistry = JSON.parse(registryData);
      console.log('✅ Universal Integration Service initialized');
      console.log(`📊 Loaded ${Object.keys(this.schemaRegistry.systems).length} system integrations`);
      console.log(`🌐 Supporting ${Object.keys(this.schemaRegistry.universalTypes).length} universal entity types`);
    } catch (error) {
      console.error('❌ Failed to initialize Universal Integration Service:', error);
      throw error;
    }
  }

  /**
   * Register a custom adapter for a software system
   */
  registerAdapter(systemName, adapter) {
    this.systemAdapters.set(systemName, adapter);
    console.log(`✅ Registered adapter for ${systemName}`);
  }

  /**
   * Get the universal type for an entity from a specific system
   */
  getUniversalType(systemName, entityType) {
    const system = this.schemaRegistry.systems[systemName];
    if (!system || !system.entities[entityType]) {
      throw new Error(`Entity ${entityType} not found in system ${systemName}`);
    }
    return system.entities[entityType].universalType;
  }

  /**
   * Transform source system data to universal format
   */
  transformToUniversal(systemName, entityType, sourceData) {
    const system = this.schemaRegistry.systems[systemName];
    if (!system || !system.entities[entityType]) {
      throw new Error(`Entity ${entityType} not found in system ${systemName}`);
    }

    const entityConfig = system.entities[entityType];
    const universalType = entityConfig.universalType;
    const universalTypeConfig = this.schemaRegistry.universalTypes[universalType];

    if (!universalTypeConfig) {
      throw new Error(`Universal type ${universalType} not found in schema registry`);
    }

    const coreData = {};
    const extendedData = {};

    // Map fields from source to universal
    Object.entries(entityConfig.fields).forEach(([sourceField, fieldConfig]) => {
      const universalField = fieldConfig.universal;
      const value = this.getNestedValue(sourceData, sourceField);
      
      if (value !== undefined && value !== null) {
        const transformedValue = this.transformValue(value, fieldConfig.type);
        
        // Determine if this is a core or extended field
        if (universalTypeConfig.coreFields && universalTypeConfig.coreFields.includes(universalField)) {
          coreData[universalField] = transformedValue;
        } else {
          extendedData[universalField] = transformedValue;
        }
      }
    });

    return {
      universalType,
      coreData: JSON.stringify(coreData),
      extendedData: Object.keys(extendedData).length > 0 ? JSON.stringify(extendedData) : null,
      rawData: JSON.stringify(sourceData)
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Transform value based on type
   */
  transformValue(value, type) {
    switch (type) {
      case 'string':
        return String(value);
      
      case 'boolean':
        return Boolean(value);
      
      case 'decimal':
        return parseFloat(value) ?? 0.0;
      
      case 'integer':
        return parseInt(value) ?? 0;
      
      case 'date':
      case 'timestamp':
        if (value instanceof Date) {
          return value.toISOString();
        }
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date.toISOString() : null;
      
      case 'address':
        return typeof value === 'object' ? value : { raw: String(value) };
      
      case 'enum':
      default:
        return value;
    }
  }

  /**
   * Create or update a universal entity from source system data
   */
  async syncEntityToUniversal(systemName, entityType, sourceEntityId, sourceData) {
    try {
      // Transform to universal format
      const universalData = this.transformToUniversal(systemName, entityType, sourceData);

      // Create or update universal entity
      const universalEntity = await prisma.universalEntity.upsert({
        where: {
          sourceSystem_sourceEntityType_sourceEntityId: {
            sourceSystem: systemName,
            sourceEntityType: entityType,
            sourceEntityId: String(sourceEntityId)
          }
        },
        update: {
          ...universalData,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncError: null
        },
        create: {
          sourceSystem: systemName,
          sourceEntityType: entityType,
          sourceEntityId: String(sourceEntityId),
          ...universalData,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date()
        }
      });

      // Log the sync operation
      await prisma.universalSyncLog.create({
        data: {
          universalEntityId: universalEntity.id,
          operation: 'sync',
          sourceSystem: systemName,
          targetSystem: 'Universal',
          syncStatus: 'SYNCED',
          syncDirection: 'source_to_target',
          syncCompletedAt: new Date()
        }
      });

      console.log(`✅ Synced ${systemName} ${entityType} ${sourceEntityId} to universal entity ${universalEntity.id}`);
      return universalEntity;

    } catch (error) {
      console.error(`❌ Failed to sync entity to universal:`, error);
      
      // Log the failed sync
      await prisma.universalSyncLog.create({
        data: {
          operation: 'sync',
          sourceSystem: systemName,
          targetSystem: 'Universal',
          syncStatus: 'FAILED',
          syncDirection: 'source_to_target',
          errorMessage: error.message,
          metadata: JSON.stringify({ entityType, sourceEntityId })
        }
      }).catch(() => {});
      
      throw error;
    }
  }

  /**
   * Map universal entity to target system format
   */
  async mapToTargetSystem(universalEntityId, targetSystem, targetEntityType) {
    try {
      // Get the universal entity
      const universalEntity = await prisma.universalEntity.findUnique({
        where: { id: universalEntityId }
      });

      if (!universalEntity) {
        throw new Error(`Universal entity ${universalEntityId} not found`);
      }

      // Get target system configuration
      const system = this.schemaRegistry.systems[targetSystem];
      if (!system || !system.entities[targetEntityType]) {
        throw new Error(`Entity ${targetEntityType} not found in system ${targetSystem}`);
      }

      const entityConfig = system.entities[targetEntityType];
      const coreData = JSON.parse(universalEntity.coreData);
      const extendedData = universalEntity.extendedData ? JSON.parse(universalEntity.extendedData) : {};
      const universalData = { ...coreData, ...extendedData };

      // Transform from universal to target format
      const targetData = {};
      Object.entries(entityConfig.fields).forEach(([targetField, fieldConfig]) => {
        const universalField = fieldConfig.universal;
        const value = universalData[universalField];
        
        if (value !== undefined && value !== null) {
          this.setNestedValue(targetData, targetField, value);
        }
      });

      // Create or update entity mapping
      const mapping = await prisma.entityMapping.upsert({
        where: {
          universalEntityId_targetSystem_targetEntityType: {
            universalEntityId,
            targetSystem,
            targetEntityType
          }
        },
        update: {
          mappingConfig: JSON.stringify(targetData),
          syncStatus: 'PENDING',
          lastSyncedAt: new Date()
        },
        create: {
          universalEntityId,
          targetSystem,
          targetEntityType,
          mappingConfig: JSON.stringify(targetData),
          syncStatus: 'PENDING'
        }
      });

      console.log(`✅ Mapped universal entity ${universalEntityId} to ${targetSystem} ${targetEntityType}`);
      return { mapping, targetData };

    } catch (error) {
      console.error(`❌ Failed to map to target system:`, error);
      throw error;
    }
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[last] = value;
  }

  /**
   * Sync entity across all configured target systems
   */
  async syncToAllSystems(universalEntityId) {
    const universalEntity = await prisma.universalEntity.findUnique({
      where: { id: universalEntityId }
    });

    if (!universalEntity) {
      throw new Error(`Universal entity ${universalEntityId} not found`);
    }

    const results = [];
    const universalType = universalEntity.universalType;

    // Find all systems that support this universal type
    for (const [systemName, systemConfig] of Object.entries(this.schemaRegistry.systems)) {
      if (!systemConfig.enabled) continue;

      // Find matching entity types in this system
      for (const [entityType, entityConfig] of Object.entries(systemConfig.entities)) {
        if (entityConfig.universalType === universalType) {
          try {
            const result = await this.mapToTargetSystem(
              universalEntityId,
              systemName,
              entityType
            );
            results.push({
              system: systemName,
              entityType,
              success: true,
              result
            });
          } catch (error) {
            results.push({
              system: systemName,
              entityType,
              success: false,
              error: error.message
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Get sync statistics for the universal integration
   */
  async getStatistics() {
    const [entities, mappings, syncLogs, systems] = await Promise.all([
      prisma.universalEntity.groupBy({
        by: ['universalType', 'sourceSystem', 'syncStatus'],
        _count: true
      }),
      prisma.entityMapping.groupBy({
        by: ['targetSystem', 'syncStatus'],
        _count: true
      }),
      prisma.universalSyncLog.groupBy({
        by: ['sourceSystem', 'targetSystem', 'syncStatus'],
        _count: true
      }),
      prisma.systemIntegration.findMany({
        select: {
          systemName: true,
          enabled: true,
          healthStatus: true,
          lastSyncAt: true
        }
      })
    ]);

    const totalEntities = await prisma.universalEntity.count();
    const totalMappings = await prisma.entityMapping.count();
    const totalSyncs = await prisma.universalSyncLog.count();

    return {
      overview: {
        totalUniversalEntities: totalEntities,
        totalMappings: totalMappings,
        totalSyncOperations: totalSyncs,
        enabledSystems: systems.filter(s => s.enabled).length
      },
      entitiesByType: entities,
      mappingsBySystem: mappings,
      syncHistory: syncLogs,
      systemHealth: systems
    };
  }

  /**
   * Validate if a system integration is supported
   */
  isSystemSupported(systemName) {
    return systemName in this.schemaRegistry.systems;
  }

  /**
   * Get list of all supported systems
   */
  getSupportedSystems() {
    return Object.entries(this.schemaRegistry.systems).map(([name, config]) => ({
      name,
      displayName: config.displayName,
      type: config.type,
      enabled: config.enabled,
      entities: Object.keys(config.entities)
    }));
  }

  /**
   * Get list of all universal types
   */
  getUniversalTypes() {
    return Object.entries(this.schemaRegistry.universalTypes).map(([name, config]) => ({
      name,
      description: config.description,
      coreFields: config.coreFields,
      extendedFields: config.extendedFields
    }));
  }

  /**
   * Find universal entities by type and system
   */
  async findEntities(filters = {}) {
    const where = {};
    
    if (filters.universalType) where.universalType = filters.universalType;
    if (filters.sourceSystem) where.sourceSystem = filters.sourceSystem;
    if (filters.syncStatus) where.syncStatus = filters.syncStatus;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return await prisma.universalEntity.findMany({
      where,
      include: {
        mappings: filters.includeMappings || false,
        syncLogs: filters.includeLogs 
          ? { take: 5, orderBy: { createdAt: 'desc' } }
          : false
      },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' }
    });
  }
}

export default UniversalIntegrationService;
