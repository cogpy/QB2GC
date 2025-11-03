import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Entity Mapper - Maps QuickBooks entities to GnuCash format based on config
 */
class EntityMapper {
  constructor(mappingConfig) {
    this.mappingConfig = mappingConfig;
  }

  /**
   * Transform a value based on the transformation rule
   */
  transformValue(value, transformType, mappingRules = null) {
    switch (transformType) {
      case 'string':
        return value ? String(value) : '';
      
      case 'boolean_inverse':
        return !value; // Active in QB = NOT placeholder in GnuCash
      
      case 'decimal':
        return parseFloat(value) || 0.0;
      
      case 'percentage_to_string':
        return value ? `${value}%` : '0%';
      
      case 'account_type_mapping':
        if (mappingRules && value) {
          return mappingRules[value] || value;
        }
        return value;
      
      default:
        return value;
    }
  }

  /**
   * Map a QB entity to GnuCash format
   */
  mapEntityToGnuCash(entityType, qbData) {
    const mapping = this.mappingConfig.mappings[entityType];
    
    if (!mapping || !mapping.enabled) {
      throw new Error(`Mapping not found or disabled for entity type: ${entityType}`);
    }

    const gcData = {
      type: mapping.defaultValues?.type || 'ASSET',
      ...mapping.defaultValues
    };

    // Map fields
    Object.entries(mapping.fieldMappings).forEach(([qbField, fieldConfig]) => {
      const qbValue = qbData[qbField];
      const transformedValue = this.transformValue(
        qbValue,
        fieldConfig.transform,
        fieldConfig.mappingRules
      );
      
      gcData[fieldConfig.gcField] = transformedValue;
    });

    return gcData;
  }
}

/**
 * GnuCash Sync Service - Handles syncing data to GnuCash
 */
export class GnuCashSyncService {
  constructor() {
    this.mappingConfig = null;
    this.entityMapper = null;
    this.configPath = path.join(__dirname, '../../config/entityMapping.json');
  }

  /**
   * Initialize the service by loading the mapping configuration
   */
  async initialize() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.mappingConfig = JSON.parse(configData);
      this.entityMapper = new EntityMapper(this.mappingConfig);
      console.log('✅ GnuCash Sync Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize GnuCash Sync Service:', error);
      throw error;
    }
  }

  /**
   * Create GnuCash XML structure for an account
   */
  createGnuCashAccount(gcData, accountId) {
    const guidNamespace = '00000000-0000-0000-0000-000000000000';
    
    return {
      'act:name': gcData.name,
      'act:id': {
        '@type': 'guid',
        '#text': accountId || this.generateGUID()
      },
      'act:type': gcData.account_type || gcData.type || 'ASSET',
      'act:commodity': {
        'cmdty:space': 'ISO4217',
        'cmdty:id': gcData.commodity || 'USD'
      },
      'act:description': gcData.description || '',
      'act:code': gcData.code || '',
      'act:parent': {
        '@type': 'guid',
        '#text': guidNamespace // Root account
      },
      'act:slots': gcData.placeholder !== undefined ? {
        'slot': {
          'slot:key': 'placeholder',
          'slot:value': {
            '@type': 'string',
            '#text': gcData.placeholder ? 'true' : 'false'
          }
        }
      } : undefined
    };
  }

  /**
   * Generate a GUID for GnuCash entities
   */
  generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sync a QBClass to GnuCash
   */
  async syncClassToGnuCash(classId) {
    const syncLog = await prisma.gnuCashSyncLog.create({
      data: {
        entityType: 'Class',
        entityId: classId,
        syncStatus: 'IN_PROGRESS',
        syncDirection: 'qb_to_gc'
      }
    });

    try {
      // Get the class data
      const qbClass = await prisma.qBClass.findUnique({
        where: { id: classId }
      });

      if (!qbClass) {
        throw new Error(`Class not found: ${classId}`);
      }

      // Map to GnuCash format
      const gcData = this.entityMapper.mapEntityToGnuCash('Class', {
        qbId: qbClass.qbId,
        name: qbClass.name,
        fullName: qbClass.fullName,
        isActive: qbClass.isActive
      });

      // Create GnuCash account structure
      const gcAccountId = this.generateGUID();
      const gcAccount = this.createGnuCashAccount(gcData, gcAccountId);

      // Update the class with GnuCash sync info
      await prisma.qBClass.update({
        where: { id: classId },
        data: {
          gcSyncStatus: 'SYNCED',
          gcSyncedAt: new Date(),
          gcAccountId: gcAccountId,
          gcSyncError: null
        }
      });

      // Update sync log
      await prisma.gnuCashSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'SYNCED',
          syncCompletedAt: new Date(),
          metadata: JSON.stringify({ gcAccountId, gcAccount })
        }
      });

      console.log(`✅ Class ${qbClass.name} synced to GnuCash`);
      return { success: true, gcAccountId, gcAccount };

    } catch (error) {
      // Update with error
      await prisma.qBClass.update({
        where: { id: classId },
        data: {
          gcSyncStatus: 'FAILED',
          gcSyncError: error.message
        }
      }).catch(() => {});

      await prisma.gnuCashSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error.message,
          syncCompletedAt: new Date()
        }
      });

      console.error(`❌ Failed to sync class ${classId}:`, error);
      throw error;
    }
  }

  /**
   * Sync an Account to GnuCash
   */
  async syncAccountToGnuCash(accountId) {
    const syncLog = await prisma.gnuCashSyncLog.create({
      data: {
        entityType: 'Account',
        entityId: accountId,
        syncStatus: 'IN_PROGRESS',
        syncDirection: 'qb_to_gc'
      }
    });

    try {
      // Get the account data
      const account = await prisma.account.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Map to GnuCash format
      const gcData = this.entityMapper.mapEntityToGnuCash('Account', {
        accountNumber: account.accountNumber,
        holderName: account.holderName,
        type: account.type,
        balance: account.balance,
        isActive: account.isActive
      });

      // Create GnuCash account structure
      const gcAccountId = this.generateGUID();
      const gcAccount = this.createGnuCashAccount(gcData, gcAccountId);

      // Update the account with GnuCash sync info
      await prisma.account.update({
        where: { id: accountId },
        data: {
          gcSyncStatus: 'SYNCED',
          gcSyncedAt: new Date(),
          gcAccountId: gcAccountId,
          gcSyncError: null
        }
      });

      // Update sync log
      await prisma.gnuCashSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'SYNCED',
          syncCompletedAt: new Date(),
          metadata: JSON.stringify({ gcAccountId, gcAccount })
        }
      });

      console.log(`✅ Account ${account.holderName} synced to GnuCash`);
      return { success: true, gcAccountId, gcAccount };

    } catch (error) {
      // Update with error
      await prisma.account.update({
        where: { id: accountId },
        data: {
          gcSyncStatus: 'FAILED',
          gcSyncError: error.message
        }
      }).catch(() => {});

      await prisma.gnuCashSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error.message,
          syncCompletedAt: new Date()
        }
      });

      console.error(`❌ Failed to sync account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Sync a Taxation record to GnuCash
   */
  async syncTaxationToGnuCash(taxationId) {
    const syncLog = await prisma.gnuCashSyncLog.create({
      data: {
        entityType: 'Taxation',
        entityId: String(taxationId),
        syncStatus: 'IN_PROGRESS',
        syncDirection: 'qb_to_gc'
      }
    });

    try {
      // Get the taxation data
      const taxation = await prisma.taxation.findUnique({
        where: { id: taxationId }
      });

      if (!taxation) {
        throw new Error(`Taxation not found: ${taxationId}`);
      }

      // Map to GnuCash format
      const gcData = this.entityMapper.mapEntityToGnuCash('Taxation', {
        title: taxation.title,
        taxRate: taxation.taxRate,
        documentNumber: taxation.documentNumber,
        isActive: taxation.isActive
      });

      // Create GnuCash account structure
      const gcAccountId = this.generateGUID();
      const gcAccount = this.createGnuCashAccount(gcData, gcAccountId);

      // Update the taxation with GnuCash sync info
      await prisma.taxation.update({
        where: { id: taxationId },
        data: {
          gcSyncStatus: 'SYNCED',
          gcSyncedAt: new Date(),
          gcAccountId: gcAccountId,
          gcSyncError: null
        }
      });

      // Update sync log
      await prisma.gnuCashSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'SYNCED',
          syncCompletedAt: new Date(),
          metadata: JSON.stringify({ gcAccountId, gcAccount })
        }
      });

      console.log(`✅ Taxation ${taxation.title} synced to GnuCash`);
      return { success: true, gcAccountId, gcAccount };

    } catch (error) {
      // Update with error
      await prisma.taxation.update({
        where: { id: taxationId },
        data: {
          gcSyncStatus: 'FAILED',
          gcSyncError: error.message
        }
      }).catch(() => {});

      await prisma.gnuCashSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error.message,
          syncCompletedAt: new Date()
        }
      });

      console.error(`❌ Failed to sync taxation ${taxationId}:`, error);
      throw error;
    }
  }

  /**
   * Batch sync multiple entities to GnuCash
   */
  async batchSyncToGnuCash(entityType, entityIds) {
    const batchSize = this.mappingConfig.syncRules.batchSize || 10;
    const results = [];

    for (let i = 0; i < entityIds.length; i += batchSize) {
      const batch = entityIds.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(id => {
          switch (entityType) {
            case 'Class':
              return this.syncClassToGnuCash(id);
            case 'Account':
              return this.syncAccountToGnuCash(id);
            case 'Taxation':
              return this.syncTaxationToGnuCash(id);
            default:
              return Promise.reject(new Error(`Unknown entity type: ${entityType}`));
          }
        })
      );

      results.push(...batchResults);
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: entityIds.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics() {
    const [classes, accounts, taxations, logs] = await Promise.all([
      prisma.qBClass.groupBy({
        by: ['gcSyncStatus'],
        _count: true
      }),
      prisma.account.groupBy({
        by: ['gcSyncStatus'],
        _count: true
      }),
      prisma.taxation.groupBy({
        by: ['gcSyncStatus'],
        _count: true
      }),
      prisma.gnuCashSyncLog.groupBy({
        by: ['syncStatus', 'entityType'],
        _count: true
      })
    ]);

    return {
      classes,
      accounts,
      taxations,
      logs,
      summary: {
        totalSyncOperations: logs.reduce((sum, l) => sum + l._count, 0)
      }
    };
  }
}

export default GnuCashSyncService;
