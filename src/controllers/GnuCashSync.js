import grpc from '@grpc/grpc-js';
import GnuCashSyncService from '../services/GnuCashSyncService.js';

const gnucashService = new GnuCashSyncService();

/**
 * Initialize GnuCash Sync Service
 */
export const initializeGnuCashService = async () => {
  try {
    await gnucashService.initialize();
    return gnucashService;
  } catch (error) {
    console.error('Failed to initialize GnuCash service:', error);
    throw error;
  }
};

/**
 * gRPC handler to sync a single Class to GnuCash
 */
export const SyncClassToGnuCash = async (call, callback) => {
  try {
    const { classId } = call.request;

    if (!classId) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'classId is required'
      });
    }

    const result = await gnucashService.syncClassToGnuCash(classId);

    callback(null, {
      success: result.success,
      message: `✅ Class synced to GnuCash`,
      gcAccountId: result.gcAccountId,
      data: JSON.stringify(result.gcAccount)
    });
  } catch (error) {
    console.error('Error syncing class to GnuCash:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

/**
 * gRPC handler to batch sync Classes to GnuCash
 */
export const BatchSyncClassesToGnuCash = async (call, callback) => {
  try {
    const classIds = [];

    call.on('data', (data) => {
      if (data.classId) {
        classIds.push(data.classId);
      }
    });

    call.on('end', async () => {
      try {
        const result = await gnucashService.batchSyncToGnuCash('Class', classIds);

        call.write({
          total: result.total,
          successful: result.successful,
          failed: result.failed,
          message: `✅ Batch sync completed: ${result.successful}/${result.total} successful`
        });

        call.end();
      } catch (error) {
        console.error('Batch sync error:', error);
        call.write({
          total: classIds.length,
          successful: 0,
          failed: classIds.length,
          message: `❌ Batch sync failed: ${error.message}`
        });
        call.end();
      }
    });

    call.on('error', (error) => {
      console.error('Stream error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

/**
 * gRPC handler to sync a single Account to GnuCash
 */
export const SyncAccountToGnuCash = async (call, callback) => {
  try {
    const { accountId } = call.request;

    if (!accountId) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'accountId is required'
      });
    }

    const result = await gnucashService.syncAccountToGnuCash(accountId);

    callback(null, {
      success: result.success,
      message: `✅ Account synced to GnuCash`,
      gcAccountId: result.gcAccountId,
      data: JSON.stringify(result.gcAccount)
    });
  } catch (error) {
    console.error('Error syncing account to GnuCash:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

/**
 * gRPC handler to batch sync Accounts to GnuCash
 */
export const BatchSyncAccountsToGnuCash = async (call, callback) => {
  try {
    const accountIds = [];

    call.on('data', (data) => {
      if (data.accountId) {
        accountIds.push(data.accountId);
      }
    });

    call.on('end', async () => {
      try {
        const result = await gnucashService.batchSyncToGnuCash('Account', accountIds);

        call.write({
          total: result.total,
          successful: result.successful,
          failed: result.failed,
          message: `✅ Batch sync completed: ${result.successful}/${result.total} successful`
        });

        call.end();
      } catch (error) {
        console.error('Batch sync error:', error);
        call.write({
          total: accountIds.length,
          successful: 0,
          failed: accountIds.length,
          message: `❌ Batch sync failed: ${error.message}`
        });
        call.end();
      }
    });

    call.on('error', (error) => {
      console.error('Stream error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

/**
 * gRPC handler to get GnuCash sync statistics
 */
export const GetSyncStatistics = async (call, callback) => {
  try {
    const stats = await gnucashService.getSyncStatistics();

    callback(null, {
      message: 'Sync statistics retrieved successfully',
      data: JSON.stringify(stats)
    });
  } catch (error) {
    console.error('Error getting sync statistics:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};
