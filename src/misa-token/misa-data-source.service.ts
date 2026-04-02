import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ObjectLiteral } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MisaApiConfig } from './entities/misa-api-config.entity';
import { MisaDataSource } from './entities/misa-data-source.entity';
import {
  MisaSyncHistory,
  MisaSyncLogEntry,
} from './entities/misa-sync-history.entity';
import { MisaCustomer } from './entities/misa-customer.entity';
import { MisaProduct } from './entities/misa-product.entity';
import { MisaStock } from './entities/misa-stock.entity';
import { MisaSaOrder } from './entities/misa-sa-order.entity';
import { MisaSaOrderDetail } from './entities/misa-sa-order-detail.entity';
import { MisaSaOrderWorkflowHistory } from './entities/misa-sa-order-workflow-history.entity';
import { MisaSaOrderAssignment } from './entities/misa-sa-order-assignment.entity';
import { MisaSaOrderTaskReport } from './entities/misa-sa-order-task-report.entity';
import { MisaPuOrder } from './entities/misa-pu-order.entity';
import { MisaPuOrderDetail } from './entities/misa-pu-order-detail.entity';
import { MisaInventoryBalance } from './entities/misa-inventory-balance.entity';
import { MisaApiService } from './services/misa-api.service';
import { MisaNotificationHelper } from './services/misa-notification.helper';
import { MisaWorkflowService } from './services/misa-workflow.service';
import { MisaAssignmentService } from './services/misa-assignment.service';
import { Employee } from 'src/employee/entities/employee.entity';
import { PurchaseRequisition } from 'src/purchase-requisition/entities/purchase-requisition.entity';

// ==================== INTERFACES & TYPES ====================

export interface ChangedRecord {
  code: string;
  name: string;
  changes: Record<string, { old: any; new: any }>;
}

export interface CreatedRecord {
  code: string;
  name: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  total: number;
  merged?: number;
  detailUpdated?: number;
  changedDetails: {
    created: CreatedRecord[];
    updated: ChangedRecord[];
    merged?: Array<{ code: string; name: string; oldRefId: string; newRefId: string }>;
    detailUpdated?: Array<{ code: string; name: string }>;
  };
}

interface EntityProcessorConfig<T extends ObjectLiteral> {
  repository: Repository<T>;
  uniqueIdField: string;
  codeField: string;
  nameField: string;
  fromMisaResponse: (data: Record<string, any>) => Partial<T>;
  entityName: string;
  entityClass: new () => T;
}

type SyncLogger = (type: MisaSyncLogEntry['type'], message: string) => Promise<void>;

// ==================== SERVICE ====================

@Injectable()
export class MisaDataSourceService {
  private readonly logger = new Logger(MisaDataSourceService.name);
  private dataProcessors!: Map<string, () => Promise<EntityProcessorConfig<any>>>;

  constructor(
    @InjectRepository(MisaApiConfig)
    private readonly apiConfigRepository: Repository<MisaApiConfig>,
    @InjectRepository(MisaDataSource)
    private readonly dataSourceRepository: Repository<MisaDataSource>,
    @InjectRepository(MisaSyncHistory)
    private readonly syncHistoryRepository: Repository<MisaSyncHistory>,
    @InjectRepository(MisaCustomer)
    private readonly customerRepository: Repository<MisaCustomer>,
    @InjectRepository(MisaProduct)
    private readonly productRepository: Repository<MisaProduct>,
    @InjectRepository(MisaStock)
    private readonly stockRepository: Repository<MisaStock>,
    @InjectRepository(MisaSaOrder)
    private readonly saOrderRepository: Repository<MisaSaOrder>,
    @InjectRepository(MisaSaOrderDetail)
    private readonly saOrderDetailRepository: Repository<MisaSaOrderDetail>,
    @InjectRepository(MisaSaOrderWorkflowHistory)
    private readonly workflowHistoryRepository: Repository<MisaSaOrderWorkflowHistory>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    @InjectRepository(MisaSaOrderAssignment)
    private readonly assignmentRepository: Repository<MisaSaOrderAssignment>,
    @InjectRepository(MisaSaOrderTaskReport)
    private readonly taskReportRepository: Repository<MisaSaOrderTaskReport>,
    @InjectRepository(MisaPuOrder)
    private readonly puOrderRepository: Repository<MisaPuOrder>,
    @InjectRepository(MisaPuOrderDetail)
    private readonly puOrderDetailRepository: Repository<MisaPuOrderDetail>,
    @InjectRepository(MisaInventoryBalance)
    private readonly inventoryBalanceRepository: Repository<MisaInventoryBalance>,
    private readonly misaApiService: MisaApiService,
    private readonly notificationHelper: MisaNotificationHelper,
    private readonly workflowService: MisaWorkflowService,
    private readonly assignmentService: MisaAssignmentService,
  ) {
    this.initDataProcessors();
  }

  private initDataProcessors(): void {
    this.dataProcessors = new Map<string, () => Promise<EntityProcessorConfig<any>>>();
    this.dataProcessors.set('customer', () => this.getCustomerProcessor());
    this.dataProcessors.set('product', () => this.getProductProcessor());
    this.dataProcessors.set('stock', () => this.getStockProcessor());
    this.dataProcessors.set('kho', () => this.getStockProcessor());      // code trong DB = 'kho'
    this.dataProcessors.set('di_stock', () => this.getStockProcessor()); // dataType từ MISA API
    this.dataProcessors.set('sa_order', () => this.getSaOrderProcessor());
    this.dataProcessors.set('sales_order', () => this.getSaOrderProcessor());
    this.dataProcessors.set('pu_order', () => this.getPuOrderProcessor());
    this.dataProcessors.set('purchase_order', () => this.getPuOrderProcessor());
    this.dataProcessors.set('inventory_balance', () => this.getInventoryBalanceProcessor());
  }

  // ==================== DATA PROCESSOR CONFIGS ====================

  private async getCustomerProcessor(): Promise<EntityProcessorConfig<MisaCustomer>> {
    return {
      repository: this.customerRepository,
      uniqueIdField: 'accountObjectId',
      codeField: 'accountObjectCode',
      nameField: 'accountObjectName',
      fromMisaResponse: MisaCustomer.fromMisaResponse,
      entityName: 'khách hàng',
      entityClass: MisaCustomer,
    };
  }

  private async getProductProcessor(): Promise<EntityProcessorConfig<MisaProduct>> {
    return {
      repository: this.productRepository,
      uniqueIdField: 'inventoryItemId',
      codeField: 'inventoryItemCode',
      nameField: 'inventoryItemName',
      fromMisaResponse: MisaProduct.fromMisaResponse,
      entityName: 'sản phẩm',
      entityClass: MisaProduct,
    };
  }

  private async getStockProcessor(): Promise<EntityProcessorConfig<MisaStock>> {
    return {
      repository: this.stockRepository,
      uniqueIdField: 'stockId',
      codeField: 'stockCode',
      nameField: 'stockName',
      fromMisaResponse: MisaStock.fromMisaResponse,
      entityName: 'kho',
      entityClass: MisaStock,
    };
  }

  private async getSaOrderProcessor(): Promise<EntityProcessorConfig<MisaSaOrder>> {
    return {
      repository: this.saOrderRepository,
      uniqueIdField: 'refId',
      codeField: 'refNo',
      nameField: 'accountObjectName',
      fromMisaResponse: MisaSaOrder.fromMisaResponse,
      entityName: 'đơn hàng',
      entityClass: MisaSaOrder,
    };
  }

  private async getPuOrderProcessor(): Promise<EntityProcessorConfig<MisaPuOrder>> {
    return {
      repository: this.puOrderRepository,
      uniqueIdField: 'refId',
      codeField: 'refNo',
      nameField: 'accountObjectName',
      fromMisaResponse: MisaPuOrder.fromMisaResponse,
      entityName: 'đơn mua hàng',
      entityClass: MisaPuOrder,
    };
  }

  private async getInventoryBalanceProcessor(): Promise<EntityProcessorConfig<MisaInventoryBalance>> {
    return {
      repository: this.inventoryBalanceRepository,
      uniqueIdField: 'recordId',
      codeField: 'stockCode',
      nameField: 'inventoryItemName',
      fromMisaResponse: MisaInventoryBalance.fromMisaResponse,
      entityName: 'tồn kho',
      entityClass: MisaInventoryBalance,
    };
  }

  // ==================== SYNC HISTORY HELPERS ====================

  private async createSyncHistoryWithLogger(
    dataSourceId: number,
    dataSourceName: string
  ): Promise<{ syncHistory: MisaSyncHistory; addLog: SyncLogger }> {
    const syncHistory = this.syncHistoryRepository.create({
      dataSourceId,
      status: 'running',
      source: 'manual',
      startedAt: new Date(),
      logs: [],
    });
    await this.syncHistoryRepository.save(syncHistory);

    const addLog: SyncLogger = async (type, message) => {
      const log: MisaSyncLogEntry = {
        type,
        message,
        timestamp: new Date().toISOString(),
      };
      syncHistory.logs = [...(syncHistory.logs || []), log];
      await this.syncHistoryRepository.save(syncHistory);
      this.logger.log(`[${dataSourceName}] ${message}`);
    };

    return { syncHistory, addLog };
  }

  private async updateSyncHistorySuccess(
    syncHistory: MisaSyncHistory,
    records: any[],
    total: number,
    syncStats?: SyncResult
  ): Promise<void> {
    syncHistory.lastResponseSample = { total, count: records.length, data: records };
    syncHistory.status = 'success';
    syncHistory.completedAt = new Date();
    syncHistory.totalRecords = total;
    syncHistory.syncedRecords = records.length;

    if (syncStats) {
      syncHistory.createdRecords = syncStats.created;
      syncHistory.updatedRecords = syncStats.updated;
      syncHistory.unchangedRecords = syncStats.unchanged;
      syncHistory.syncedRecords = syncStats.created + syncStats.updated;
      syncHistory.changedDetails = syncStats.changedDetails;
    }

    await this.syncHistoryRepository.save(syncHistory);
  }

  private async updateSyncHistoryError(
    syncHistory: MisaSyncHistory,
    errorMessage: string,
    errorData?: any
  ): Promise<void> {
    syncHistory.status = 'failed';
    syncHistory.completedAt = new Date();
    syncHistory.errorMessage = errorMessage;
    syncHistory.lastResponseSample = { error: true, ...errorData };
    await this.syncHistoryRepository.save(syncHistory);
  }

  async getInventoryBalanceByStockId(stockId: string): Promise<MisaInventoryBalance[]> {
    return this.inventoryBalanceRepository.find({
      where: { stockId },
      order: {
        closingQuantity: 'DESC',
        inventoryItemName: 'ASC',
      },
    });
  }

  // ==================== MAIN SYNC METHOD ====================

  async startSync(dataSourceId: number): Promise<{
    success: boolean;
    message: string;
    syncId?: number;
    data?: any;
    total?: number;
    tokenRefreshing?: boolean;
    syncStats?: SyncResult;
  }> {
    const dataSource = await this.getDataSourceById(dataSourceId);
    if (!dataSource) {
      return { success: false, message: 'Data source not found' };
    }

    const apiConfig = await this.getApiConfig();
    if (!apiConfig) {
      return { success: false, message: 'Chưa cấu hình API MISA. Vui lòng cấu hình trước.' };
    }

    const { syncHistory, addLog } = await this.createSyncHistoryWithLogger(dataSourceId, dataSource.name);

    // Get token
    await addLog('info', 'Đang kiểm tra token MISA...');
    let token = await this.misaApiService.getToken();

    if (!token) {
      await addLog('warning', 'Token MISA hết hạn hoặc không hợp lệ');
      await addLog('info', 'Đang làm mới token MISA...');
      try {
        token = await this.misaApiService.refreshToken();
        await addLog('success', 'Làm mới token MISA thành công!');
      } catch (error: any) {
        await addLog('error', `Lỗi làm mới token: ${error.message}`);
        await this.updateSyncHistoryError(syncHistory, 'Không thể lấy/làm mới token MISA');
        return { success: false, message: 'Không thể lấy token MISA. Vui lòng thử lại.', syncId: syncHistory.id };
      }
    } else {
      await addLog('success', 'Token MISA hợp lệ');
    }

    const url = dataSource.apiEndpoint || apiConfig.baseUrl;
    const requestBody = dataSource.buildRequestBody(1, undefined, undefined, apiConfig.branchId || '');

    syncHistory.lastRequest = {
      url,
      headers: { 'X-MISA-Context': this.misaApiService.buildMisaHeaders(token, apiConfig)['X-MISA-Context'], 'X-Device': apiConfig.deviceId },
      body: requestBody,
    };
    await this.syncHistoryRepository.save(syncHistory);

    await addLog('info', `Bắt đầu kéo dữ liệu ${dataSource.name}...`);

    let records: any[] = [];
    let total = 0;
    let apiResult: any;

    if (dataSource.code === 'inventory_balance') {
      const activeStocks = await this.stockRepository.find({ where: { inactive: false } });
      if (activeStocks.length === 0) {
        await addLog('warning', 'Không tìm thấy kho nào để lấy tồn kho.');
        return { success: false, message: 'Không tìm thấy kho nào để lấy tồn kho.' };
      }

      await addLog('info', `Bắt đầu lấy tồn kho tổng hợp cho tất cả các kho (Sử dụng mã hệ thống All-Stocks)...`);

      const clonedBody = JSON.parse(JSON.stringify(requestBody));
      clonedBody.requestFrom = 1;
      clonedBody.pageSize = 100000;
      clonedBody.pageIndex = 1;

      if (clonedBody.parameters) {
        let paramObj: any = {};
        if (typeof clonedBody.parameters === 'string') {
          try {
            paramObj = JSON.parse(Buffer.from(clonedBody.parameters, 'base64').toString('utf8'));
          } catch (e: any) {
            await addLog('warning', `Không thể parse parameters base64: ${e.message}`);
          }
        } else if (typeof clonedBody.parameters === 'object') {
          paramObj = { ...clonedBody.parameters };
        }
        
        paramObj.p_list_stock_id = '99999999-9999-9999-9999-999999999999,';
        const branchIds = [...new Set(activeStocks.map(s => s.branchId).filter(id => !!id))];
        if (branchIds.length > 0) {
          paramObj.p_branch_id = branchIds.join(',') + ',';
          await addLog('info', `Gộp ${branchIds.length} chi nhánh vào yêu cầu tổng hợp.`);
        }
        delete paramObj.p_session_key;
        clonedBody.parameters = Buffer.from(JSON.stringify(paramObj)).toString('base64');
      }

      try {
        let stockApiResult = await this.misaApiService.callMisaApi(url, clonedBody, token, apiConfig);
        if (!stockApiResult.success && !syncHistory.lastResponseSample?.retried) {
          try {
            const newToken = await this.misaApiService.refreshToken();
            token = newToken;
            syncHistory.lastResponseSample = { retried: true };
            stockApiResult = await this.misaApiService.callMisaApi(url, clonedBody, token, apiConfig);
          } catch (e: any) {}
        }

        if (stockApiResult.success && stockApiResult.data) {
          records = stockApiResult.data;
          total = records.length;
          apiResult = { success: true, data: records, total };
          await addLog('success', `Đã lấy thành công ${records.length} bản ghi tồn kho tổng hợp.`);
        } else {
          apiResult = stockApiResult;
        }
      } catch (e: any) {
        await addLog('error', `Lỗi xử lý API tổng hợp: ${e.message}`);
        apiResult = { success: false, message: e.message };
      }
    } else {
      // Logic bình thường
      apiResult = await this.misaApiService.callMisaApi(url, requestBody, token, apiConfig);

      // Retry với token mới nếu lỗi
      if (!apiResult.success && !syncHistory.lastResponseSample?.retried) {
        await addLog('warning', 'Đang thử làm mới token và gọi lại...');
        try {
          const newToken = await this.misaApiService.refreshToken();
          await addLog('success', 'Làm mới token thành công, đang thử lại...');
          syncHistory.lastResponseSample = { retried: true };
          await this.syncHistoryRepository.save(syncHistory);
          apiResult = await this.misaApiService.callMisaApi(url, requestBody, newToken, apiConfig);
        } catch (error: any) {
          await addLog('error', `Không thể làm mới token: ${error.message}`);
        }
      }
    }

    if (!apiResult.success) {
      const errorMsg = apiResult.error?.message || 'Lỗi không xác định';
      await addLog('error', `MISA API trả về lỗi: ${errorMsg}`);
      await this.updateSyncHistoryError(syncHistory, errorMsg, apiResult.error);
      return { success: false, message: errorMsg, syncId: syncHistory.id, data: apiResult.error };
    }

    if (dataSource.code !== 'inventory_balance') {
      records = apiResult.data || [];
      total = apiResult.total || 0;
    }

    await addLog('success', `Nhận được tổng cộng ${records.length} bản ghi`);

    let syncStats: SyncResult | undefined;
    if (records.length > 0) {
      syncStats = await this.processRecordsForDataSource(dataSource.code, records, addLog);

      // Fetch chi tiết cho sa_order
      if ((dataSource.code === 'sa_order' || dataSource.code === 'sales_order') && syncStats) {
        const detailResult = await this.fetchSaOrderDetailsAfterSync(records, token, apiConfig, dataSource, addLog, syncStats);
        if (detailResult.ordersWithDetailChanges.length > 0) {
          syncStats.detailUpdated = detailResult.ordersWithDetailChanges.length;
          syncStats.changedDetails.detailUpdated = detailResult.ordersWithDetailChanges;
        }
      }

      // Fetch chi tiết cho pu_order
      if ((dataSource.code === 'pu_order' || dataSource.code === 'purchase_order') && syncStats) {
        const detailResult = await this.fetchPuOrderDetailsAfterSync(records, token, apiConfig, dataSource, addLog, syncStats);
        if (detailResult.ordersWithDetailChanges.length > 0) {
          syncStats.detailUpdated = detailResult.ordersWithDetailChanges.length;
          syncStats.changedDetails.detailUpdated = detailResult.ordersWithDetailChanges;
        }
      }
    }

    await this.updateSyncHistorySuccess(syncHistory, records, total, syncStats);
    await addLog('success', `Hoàn thành kéo dữ liệu ${dataSource.name}`);

    return {
      success: true,
      message: `Kéo thành công ${records.length} bản ghi`,
      syncId: syncHistory.id,
      total,
      syncStats,
      data: records,
    };
  }

  private async processRecordsForDataSource(
    code: string,
    records: any[],
    addLog: SyncLogger
  ): Promise<SyncResult | undefined> {
    if (code === 'sa_order' || code === 'sales_order') {
      const syncResult = await this.saveSaOrders(records);
      await addLog(
        'success',
        `Đã xử lý ${syncResult.total} đơn hàng: ${syncResult.created} mới, ${syncResult.updated} cập nhật, ${syncResult.unchanged} không đổi${syncResult.errors > 0 ? `, ${syncResult.errors} lỗi` : ''}`
      );
      return syncResult;
    }

    const processorFactory = this.dataProcessors.get(code);
    if (!processorFactory) {
      await addLog('info', `Không có processor cho data source code: ${code}`);
      return undefined;
    }

    const processor = await processorFactory();
    const syncResult = await this.bulkUpsert(records, processor);

    await addLog(
      'success',
      `Đã xử lý ${syncResult.total} ${processor.entityName}: ${syncResult.created} mới, ${syncResult.updated} cập nhật, ${syncResult.unchanged} không đổi${syncResult.errors > 0 ? `, ${syncResult.errors} lỗi` : ''}`
    );

    return syncResult;
  }

  // ==================== GENERIC BULK UPSERT ====================

  private async bulkUpsert<T extends ObjectLiteral>(
    records: Record<string, any>[],
    config: EntityProcessorConfig<T>
  ): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      total: records.length,
      changedDetails: { created: [], updated: [] },
    };

    const validRecords: { data: Partial<T>; code: string; name: string }[] = [];
    for (const record of records) {
      const entityData = config.fromMisaResponse(record);
      const uniqueId = entityData[config.uniqueIdField as keyof typeof entityData];
      const code = entityData[config.codeField as keyof typeof entityData] as string;

      if (!uniqueId || !code) {
        this.logger.warn(`Bỏ qua ${config.entityName} không có ID hoặc mã:`, record);
        result.errors++;
        continue;
      }

      validRecords.push({
        data: entityData,
        code,
        name: entityData[config.nameField as keyof typeof entityData] as string,
      });
    }

    if (validRecords.length === 0) return result;

    const existingIds = validRecords.map(r => r.data[config.uniqueIdField as keyof typeof r.data]);
    const existingRecords = await config.repository
      .createQueryBuilder('e')
      .where(`e.${config.uniqueIdField} IN (:...ids)`, { ids: existingIds })
      .getMany();

    const existingMap = new Map<string, T>(
      existingRecords.map(r => [r[config.uniqueIdField as keyof typeof r] as string, r])
    );

    const toInsert: Partial<T>[] = [];
    const toUpdate: { id: number; data: Partial<T> }[] = [];

    for (const { data, code, name } of validRecords) {
      const uniqueId = data[config.uniqueIdField as keyof typeof data] as string;
      const existing = existingMap.get(uniqueId);

      if (existing) {
        const changes = this.getChanges(existing, data as Record<string, any>);
        if (changes) {
          toUpdate.push({ id: (existing as any).id, data });
          result.changedDetails.updated.push({ code, name, changes });
        } else {
          result.unchanged++;
        }
      } else {
        toInsert.push(data);
        result.changedDetails.created.push({ code, name });
      }
    }

    await this.executeBulkInsert(toInsert, config, result);
    await this.executeBulkUpdate(toUpdate, config, result);

    return result;
  }

  private async executeBulkInsert<T extends ObjectLiteral>(
    toInsert: Partial<T>[],
    config: EntityProcessorConfig<T>,
    result: SyncResult
  ): Promise<void> {
    if (toInsert.length === 0) return;

    const BATCH_SIZE = 500;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      try {
        await config.repository.createQueryBuilder().insert().into(config.entityClass).values(batch as any).orIgnore().execute();
        result.created += batch.length;
      } catch (error: any) {
        this.logger.error(`Lỗi bulk insert batch ${i}-${i + batch.length}:`, error.message);
        result.errors += batch.length;
      }
    }
  }

  private async executeBulkUpdate<T extends ObjectLiteral>(
    toUpdate: { id: number; data: Partial<T> }[],
    config: EntityProcessorConfig<T>,
    result: SyncResult
  ): Promise<void> {
    if (toUpdate.length === 0) return;

    const UPDATE_BATCH_SIZE = 100;
    for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + UPDATE_BATCH_SIZE);
      try {
        await Promise.all(batch.map(item => config.repository.update({ id: item.id } as any, item.data as any)));
        result.updated += batch.length;
      } catch (error: any) {
        this.logger.error(`Lỗi bulk update batch ${i}-${i + batch.length}:`, error.message);
        result.errors += batch.length;
      }
    }
  }

  // ==================== UTILITY METHODS ====================

  private getChanges(
    existing: Record<string, any>,
    incoming: Record<string, any>
  ): Record<string, { old: any; new: any }> | null {
    const ignoreFields = [
      'id', 'createdAt', 'updatedAt', 'deletedAt', 'editVersion', 'refDate', 'misaCreatedDate',
      'requestedDeliveryDate', 'actualExportDate', 'goodsStatus', 'machineType', 'region',
      'priority', 'localDeliveryStatus', 'saleType', 'receiverName', 'receiverPhone',
      'specificAddress', 'orderWorkflowStatus', 'saleAdminId', 'saleAdminName',
      'saleAdminSubmittedAt', 'approvedById', 'approvedByName', 'approvedAt', 'approvalNote',
    ];
    const dateFields = ['misaModifiedDate', 'deliveryDate', 'expectedDate'];
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key of Object.keys(incoming)) {
      if (ignoreFields.includes(key)) continue;

      const existingValue = existing[key];
      const incomingValue = incoming[key];

      if (existingValue == null && incomingValue == null) continue;

      if (dateFields.includes(key)) {
        if (!this.areDatesEqual(existingValue, incomingValue)) {
          changes[key] = { old: existingValue, new: incomingValue };
        }
        continue;
      }

      if (typeof existingValue === 'object' && typeof incomingValue === 'object') {
        if (JSON.stringify(existingValue) !== JSON.stringify(incomingValue)) {
          changes[key] = { old: existingValue, new: incomingValue };
        }
      } else {
        const existingNum = Number(existingValue);
        const incomingNum = Number(incomingValue);

        if (!isNaN(existingNum) && !isNaN(incomingNum)) {
          if (existingNum !== incomingNum) {
            changes[key] = { old: existingValue, new: incomingValue };
          }
        } else if (existingValue !== incomingValue) {
          changes[key] = { old: existingValue, new: incomingValue };
        }
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private areDatesEqual(date1: any, date2: any): boolean {
    if (date1 == null && date2 == null) return true;
    if (date1 == null || date2 == null) return false;

    try {
      const getDateStringVN = (d: any): string => {
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        return dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
      };
      return getDateStringVN(date1) === getDateStringVN(date2);
    } catch {
      return false;
    }
  }

  // ==================== DATA SOURCE CRUD ====================

  async getAllDataSources(): Promise<MisaDataSource[]> {
    return this.dataSourceRepository.find({
      where: { deletedAt: IsNull(), isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async getDataSourceById(id: number): Promise<MisaDataSource | null> {
    return this.dataSourceRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['apiConfig'],
    });
  }

  async getDataSourceByCode(code: string): Promise<MisaDataSource | null> {
    return this.dataSourceRepository.findOne({
      where: { code, deletedAt: IsNull() },
      relations: ['apiConfig'],
    });
  }

  async updateDataSource(id: number, data: Partial<MisaDataSource>): Promise<MisaDataSource> {
    await this.dataSourceRepository.update(id, data);
    return this.getDataSourceById(id) as Promise<MisaDataSource>;
  }

  async createDataSource(data: Partial<MisaDataSource>): Promise<MisaDataSource> {
    const maxOrder = await this.dataSourceRepository
      .createQueryBuilder('ds')
      .select('MAX(ds.displayOrder)', 'max')
      .where('ds.deletedAt IS NULL')
      .getRawOne();

    const dataSource = this.dataSourceRepository.create({
      ...data,
      displayOrder: (maxOrder?.max || 0) + 1,
    });
    return this.dataSourceRepository.save(dataSource);
  }

  async deleteDataSource(id: number): Promise<void> {
    await this.dataSourceRepository.update(id, { deletedAt: new Date(), isActive: false });
  }

  async updateDisplayOrders(orders: { id: number; displayOrder: number }[]): Promise<void> {
    await Promise.all(orders.map(item => this.dataSourceRepository.update(item.id, { displayOrder: item.displayOrder })));
  }

  // ==================== API CONFIG ====================

  async getApiConfig(): Promise<MisaApiConfig | null> {
    return this.apiConfigRepository.findOne({
      where: { deletedAt: IsNull(), isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async saveApiConfig(data: Partial<MisaApiConfig>): Promise<MisaApiConfig> {
    let config = await this.getApiConfig();

    if (config) {
      Object.assign(config, data);
      return this.apiConfigRepository.save(config);
    } else {
      config = this.apiConfigRepository.create(data);
      return this.apiConfigRepository.save(config);
    }
  }

  // ==================== SYNC HISTORY ====================

  async getSyncHistory(dataSourceId: number, page = 1, limit = 10): Promise<{ data: MisaSyncHistory[]; total: number }> {
    const [data, total] = await this.syncHistoryRepository.findAndCount({
      where: { dataSourceId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getSyncHistoryById(syncId: number): Promise<MisaSyncHistory | null> {
    return this.syncHistoryRepository.findOne({ where: { id: syncId, deletedAt: IsNull() } });
  }

  // ==================== TEST FETCH ====================

  async testFetch(dataSourceId: number, pageIndex = 1, pageSize = 20): Promise<{ success: boolean; message: string; data?: any; total?: number }> {
    const dataSource = await this.getDataSourceById(dataSourceId);
    if (!dataSource) return { success: false, message: 'Data source not found' };

    const apiConfig = await this.getApiConfig();
    if (!apiConfig) return { success: false, message: 'Chưa cấu hình API MISA' };

    const token = await this.misaApiService.getToken();
    if (!token) return { success: false, message: 'Chưa có token MISA. Vui lòng làm mới token.' };

    const url = dataSource.apiEndpoint || apiConfig.baseUrl;
    const requestBody = dataSource.buildRequestBody(pageIndex, undefined, undefined, apiConfig.branchId || '');
    requestBody.pageSize = pageSize;

    const result = await this.misaApiService.callMisaApi(url, requestBody, token, apiConfig);

    if (!result.success) {
      return { success: false, message: result.error?.message || 'Lỗi không xác định', data: result.error };
    }

    return { success: true, message: `Lấy được ${result.data?.length || 0} bản ghi`, data: result.data, total: result.total };
  }

  // ==================== ENTITY-SPECIFIC QUERIES ====================

  async getCustomers(page = 1, limit = 50, search?: string): Promise<{ data: MisaCustomer[]; total: number }> {
    const qb = this.customerRepository.createQueryBuilder('customer').where('customer.deletedAt IS NULL');
    if (search) {
      qb.andWhere('(customer.accountObjectCode ILIKE :search OR customer.accountObjectName ILIKE :search OR customer.tel ILIKE :search)', { search: `%${search}%` });
    }
    qb.orderBy('customer.accountObjectCode', 'ASC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getCustomerById(id: number): Promise<MisaCustomer | null> {
    return this.customerRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async getProducts(page = 1, limit = 50, search?: string): Promise<{ data: MisaProduct[]; total: number }> {
    const qb = this.productRepository.createQueryBuilder('product').where('product.deletedAt IS NULL');
    if (search) {
      qb.andWhere('(product.inventoryItemCode ILIKE :search OR product.inventoryItemName ILIKE :search)', { search: `%${search}%` });
    }
    qb.orderBy('product.inventoryItemCode', 'ASC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getProductById(id: number): Promise<MisaProduct | null> {
    return this.productRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async getStocks(page = 1, limit = 50, search?: string): Promise<{ data: MisaStock[]; total: number }> {
    const qb = this.stockRepository.createQueryBuilder('stock').where('stock.deletedAt IS NULL');
    if (search) {
      qb.andWhere('(stock.stockCode ILIKE :search OR stock.stockName ILIKE :search)', { search: `%${search}%` });
    }
    qb.orderBy('stock.stockCode', 'ASC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getStockById(id: number): Promise<MisaStock | null> {
    return this.stockRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  // ==================== SUPPLIER (VENDOR) QUERIES ====================

  async getSuppliers(page = 1, limit = 50, search?: string): Promise<{ data: MisaCustomer[]; total: number }> {
    const qb = this.customerRepository.createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL')
      .andWhere('customer.isVendor = :isVendor', { isVendor: true });
    if (search) {
      qb.andWhere('(customer.accountObjectCode ILIKE :search OR customer.accountObjectName ILIKE :search OR customer.tel ILIKE :search)', { search: `%${search}%` });
    }
    qb.orderBy('customer.accountObjectCode', 'ASC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getSupplierById(id: number): Promise<MisaCustomer | null> {
    return this.customerRepository.findOne({ where: { id, isVendor: true, deletedAt: IsNull() } });
  }

  // ==================== LEGACY SAVE METHODS ====================

  async saveCustomers(records: Record<string, any>[]): Promise<SyncResult> {
    const processor = await this.getCustomerProcessor();
    return this.bulkUpsert(records, processor);
  }

  async saveProducts(records: Record<string, any>[]): Promise<SyncResult> {
    const processor = await this.getProductProcessor();
    return this.bulkUpsert(records, processor);
  }

  async saveStocks(records: Record<string, any>[]): Promise<SyncResult> {
    const processor = await this.getStockProcessor();
    return this.bulkUpsert(records, processor);
  }

  async savePuOrders(records: Record<string, any>[]): Promise<SyncResult> {
    const processor = await this.getPuOrderProcessor();
    return this.bulkUpsert(records, processor);
  }

  async saveSaOrders(records: Record<string, any>[]): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      total: records.length,
      merged: 0,
      changedDetails: { created: [], updated: [], merged: [] },
    };

    const validRecords: { data: Partial<MisaSaOrder>; refId: string; refNo: string; name: string }[] = [];
    for (const record of records) {
      const entityData = MisaSaOrder.fromMisaResponse(record);
      if (!entityData.refId || !entityData.refNo) {
        result.errors++;
        continue;
      }
      validRecords.push({ data: entityData, refId: entityData.refId, refNo: entityData.refNo, name: entityData.accountObjectName || '' });
    }

    if (validRecords.length === 0) return result;

    const refIds = validRecords.map(r => r.refId);
    const refNos = validRecords.map(r => r.refNo);

    const existingByRefId = await this.saOrderRepository.createQueryBuilder('order').where('order.refId IN (:...refIds)', { refIds }).getMany();
    const refIdMap = new Map<string, MisaSaOrder>(existingByRefId.map(o => [o.refId, o]));

    const manualOrdersByRefNo = await this.saOrderRepository
      .createQueryBuilder('order')
      .where('order.refNo IN (:...refNos)', { refNos })
      .andWhere('order.refId NOT IN (:...refIds)', { refIds })
      .andWhere('(order.source = :source OR order.source IS NULL)', { source: 'manual' })
      .getMany();

    const refNoManualMap = new Map<string, MisaSaOrder>(manualOrdersByRefNo.map(o => [o.refNo, o]));

    const toInsert: Partial<MisaSaOrder>[] = [];
    const toUpdate: { id: number; data: Partial<MisaSaOrder>; isMerge: boolean; oldRefId?: string; refNo: string; name: string }[] = [];

    const localFields: (keyof MisaSaOrder)[] = [
      'requestedDeliveryDate', 'actualExportDate', 'goodsStatus', 'machineType', 'region',
      'priority', 'localDeliveryStatus', 'saleType', 'receiverName', 'receiverPhone',
      'specificAddress', 'orderWorkflowStatus', 'saleAdminId', 'saleAdminName', 'saleAdminSubmittedAt',
    ];

    for (const { data, refId, refNo, name } of validRecords) {
      let existing = refIdMap.get(refId);
      let isMerge = false;

      if (!existing) {
        existing = refNoManualMap.get(refNo);
        if (existing) isMerge = true;
      }

      if (existing) {
        const changes = this.getChanges(existing, data as Record<string, any>);
        if (changes || isMerge) {
          const updateData: Partial<MisaSaOrder> = { ...data };
          if (isMerge) {
            updateData.refId = refId;
            updateData.source = 'misa';
            for (const field of localFields) {
              if (existing[field] != null) delete updateData[field];
            }
          }
          toUpdate.push({ id: existing.id, data: updateData, isMerge, oldRefId: isMerge ? existing.refId : undefined, refNo, name });
          result.changedDetails.updated.push({ code: refNo, name, changes: isMerge ? { _merged: { old: 'manual', new: 'misa' }, ...changes } : changes! });
        } else {
          result.unchanged++;
        }
      } else {
        toInsert.push({ ...data, source: 'misa' });
        result.changedDetails.created.push({ code: refNo, name });
      }
    }

    // Bulk insert
    if (toInsert.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        try {
          await this.saOrderRepository.createQueryBuilder().insert().into(MisaSaOrder).values(batch as any).execute();
          result.created += batch.length;
        } catch (error: any) {
          this.logger.error(`Lỗi bulk insert đơn hàng batch ${i}-${i + batch.length}:`, error.message);
          result.errors += batch.length;
        }
      }
    }

    // Update
    for (const item of toUpdate) {
      try {
        if (item.isMerge && item.data.refId) {
          const currentOrder = await this.saOrderRepository.findOne({ where: { id: item.id } });
          if (currentOrder && currentOrder.refId !== item.data.refId) {
            await this.saOrderDetailRepository.delete({ refId: currentOrder.refId });
          }
        }
        await this.saOrderRepository.update({ id: item.id }, item.data as any);

        if (item.isMerge && item.data.refId) {
          result.merged = (result.merged || 0) + 1;
          result.changedDetails.merged = result.changedDetails.merged || [];
          result.changedDetails.merged.push({ code: item.refNo, name: item.name, oldRefId: item.oldRefId || '', newRefId: item.data.refId });
        }
        result.updated++;
      } catch (error: any) {
        this.logger.error(`Lỗi update đơn hàng id=${item.id}:`, error.message);
        result.errors++;
      }
    }

    return result;
  }

  // ==================== SA ORDER QUERIES ====================

  async getSaOrders(
    page = 1,
    limit = 50,
    search?: string,
    startDate?: string,
    endDate?: string,
    workflowStatus?: string,
    source?: string,
    priority?: string,
    region?: string,
    localStatus?: string,
    province?: string,
    reqDeliveryStartDate?: string,
    reqDeliveryEndDate?: string,
    actualExportStartDate?: string,
    actualExportEndDate?: string
  ): Promise<{ data: MisaSaOrder[]; meta: any }> {
    const qb = this.saOrderRepository.createQueryBuilder('order').where('order.deletedAt IS NULL');

    // Search filter
    if (search) {
      qb.andWhere('(order.refNo ILIKE :search OR order.accountObjectName ILIKE :search OR order.accountObjectCode ILIKE :search)', { search: `%${search}%` });
    }

    // Date range filter (based on refDate - ngày đơn hàng)
    if (startDate) {
      qb.andWhere('order.refDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('order.refDate <= :endDate', { endDate });
    }

    // Workflow status filter
    if (workflowStatus && workflowStatus !== 'all') {
      qb.andWhere('order.orderWorkflowStatus = :workflowStatus', { workflowStatus });
    }

    // Source filter (misa or manual)
    if (source && source !== 'all') {
      qb.andWhere('order.source = :source', { source });
    }

    // Priority filter
    if (priority && priority !== 'all') {
      qb.andWhere('order.priority = :priority', { priority });
    }

    // Region filter
    if (region && region !== 'all') {
      qb.andWhere('order.region = :region', { region });
    }

    // Local delivery status filter
    if (localStatus && localStatus !== 'all') {
      qb.andWhere('order.localDeliveryStatus = :localStatus', { localStatus });
    }

    // Province filter
    if (province) {
      qb.andWhere('order.province ILIKE :province', { province: `%${province}%` });
    }

    // Requested delivery date filter
    if (reqDeliveryStartDate) {
      qb.andWhere('order.requestedDeliveryDate >= :reqDeliveryStartDate', { reqDeliveryStartDate });
    }
    if (reqDeliveryEndDate) {
      qb.andWhere('order.requestedDeliveryDate <= :reqDeliveryEndDate', { reqDeliveryEndDate });
    }

    // Actual export date filter
    if (actualExportStartDate) {
      qb.andWhere('order.actualExportDate >= :actualExportStartDate', { actualExportStartDate });
    }
    if (actualExportEndDate) {
      qb.andWhere('order.actualExportDate <= :actualExportEndDate', { actualExportEndDate });
    }

    qb.orderBy('order.refDate', 'DESC').addOrderBy('order.refNo', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getSaOrderById(id: number): Promise<MisaSaOrder | null> {
    return this.saOrderRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async getSaOrderByRefId(refId: string): Promise<MisaSaOrder | null> {
    return this.saOrderRepository.findOne({ where: { refId, deletedAt: IsNull() } });
  }

  async updateSaOrderLocalFields(
    id: number,
    data: {
      requestedDeliveryDate?: string | null;
      actualExportDate?: string | null;
      goodsStatus?: string | null;
      machineType?: string | null;
      region?: string | null;
      priority?: string | null;
      localDeliveryStatus?: string | null;
      saleType?: string | null;
      receiverName?: string | null;
      receiverPhone?: string | null;
      specificAddress?: string | null;
      province?: string | null;
      needsAdditionalOrder?: boolean;
      additionalOrderNote?: string | null;
    },
    updatedByName?: string
  ): Promise<MisaSaOrder | null> {
    const order = await this.getSaOrderById(id);
    if (!order) return null;

    const hasAdditionalOrderChange =
      ('needsAdditionalOrder' in data && data.needsAdditionalOrder !== order.needsAdditionalOrder) ||
      ('additionalOrderNote' in data && data.additionalOrderNote !== order.additionalOrderNote);

    const shouldNotify = hasAdditionalOrderChange && order.orderWorkflowStatus !== 'draft';

    const allowedFields = [
      'requestedDeliveryDate', 'actualExportDate', 'goodsStatus', 'machineType', 'region',
      'priority', 'localDeliveryStatus', 'saleType', 'receiverName', 'receiverPhone',
      'specificAddress', 'province', 'needsAdditionalOrder', 'additionalOrderNote',
    ];

    const updateData: Partial<MisaSaOrder> = {};
    for (const field of allowedFields) {
      if (field in data) (updateData as any)[field] = (data as any)[field];
    }

    await this.saOrderRepository.update(id, updateData);
    const updatedOrder = await this.getSaOrderById(id);

    if (shouldNotify && updatedOrder) {
      await this.notificationHelper.notifyAdditionalOrderChange(updatedOrder, updatedByName);
    }

    return updatedOrder;
  }

  async getSaOrderDetailsByRefId(refId: string): Promise<MisaSaOrderDetail[]> {
    return this.saOrderDetailRepository.find({ where: { refId, deletedAt: IsNull() }, order: { sortOrder: 'ASC' } });
  }

  async getSaOrderWithDetails(id: number): Promise<{ order: MisaSaOrder | null; details: MisaSaOrderDetail[] }> {
    const order = await this.getSaOrderById(id);
    if (!order) return { order: null, details: [] };
    const details = await this.getSaOrderDetailsByRefId(order.refId);
    return { order, details };
  }

  async saveSaOrderDetails(refId: string, detailsData: Record<string, any>[]): Promise<{ details: MisaSaOrderDetail[]; hasChanges: boolean; stats: { added: number; removed: number; updated: number } }> {
    const oldDetails = await this.saOrderDetailRepository.find({ where: { refId } });
    const newDetails: MisaSaOrderDetail[] = [];

    for (let i = 0; i < detailsData.length; i++) {
      const detailEntity = this.saOrderDetailRepository.create(MisaSaOrderDetail.fromMisaResponse(refId, detailsData[i], i));
      newDetails.push(detailEntity);
    }

    const stats = this.compareDetailChanges(oldDetails, newDetails);
    const hasChanges = stats.added > 0 || stats.removed > 0 || stats.updated > 0;

    if (hasChanges) {
      await this.saOrderDetailRepository.delete({ refId });
      if (newDetails.length > 0) await this.saOrderDetailRepository.save(newDetails);
    }

    return { details: newDetails, hasChanges, stats };
  }

  private compareDetailChanges(oldDetails: MisaSaOrderDetail[], newDetails: MisaSaOrderDetail[]): { added: number; removed: number; updated: number } {
    const oldMap = new Map<number, MisaSaOrderDetail>();
    for (const d of oldDetails) oldMap.set(d.sortOrder, d);

    let added = 0, updated = 0;

    for (const newDetail of newDetails) {
      const oldDetail = oldMap.get(newDetail.sortOrder);
      if (!oldDetail) {
        added++;
      } else {
        if (this.isDetailChanged(oldDetail, newDetail)) updated++;
        oldMap.delete(newDetail.sortOrder);
      }
    }

    return { added, removed: oldMap.size, updated };
  }

  private isDetailChanged(oldDetail: MisaSaOrderDetail, newDetail: MisaSaOrderDetail): boolean {
    const fieldsToCompare = ['inventoryItemCode', 'description', 'quantity', 'unitPrice', 'amountOc', 'stockCode', 'unitName'];
    for (const field of fieldsToCompare) {
      const oldVal = (oldDetail as any)[field];
      const newVal = (newDetail as any)[field];
      if (typeof oldVal === 'number' || typeof newVal === 'number') {
        if (Number(oldVal) !== Number(newVal)) return true;
      } else if (oldVal !== newVal) return true;
    }
    return false;
  }

  // ==================== SA ORDER DETAIL FETCHING ====================

  private buildSaOrderDetailRequestBody(refId: string): Record<string, any> {
    return {
      columns: [2157, 1355, 4670, 5274, 3870, 3878, 3876, 5279, 308, 5364, 5350, 3334, 995, 5936, 1122, 1124, 3404, 5476, 5575, 2358],
      sort: '[{"property":4555,"desc":false,"data_type":4,"operand":1}]',
      filter: [{ property: 3993, operator: 7, operand: 1, value: refId, data_type: 10 }],
      pageIndex: 1,
      pageSize: 50,
      useSp: false,
      summaryColumns: [3488, 3870, 3878, 3879, 3876, 3877, 2717, 2719, 308, 5350],
      loadMode: 2,
    };
  }

  private async fetchAndSaveSaOrderDetails(refId: string, token: string, apiConfig: MisaApiConfig, detailApiUrl: string): Promise<{ success: boolean; count: number; hasChanges: boolean; error?: string }> {
    try {
      const orderExists = await this.saOrderRepository.findOne({ where: { refId } });
      if (!orderExists) return { success: false, count: 0, hasChanges: false, error: 'Order không tồn tại' };

      const requestBody = this.buildSaOrderDetailRequestBody(refId);
      const result = await this.misaApiService.callMisaApi(detailApiUrl, requestBody, token, apiConfig);

      if (!result.success) return { success: false, count: 0, hasChanges: false, error: result.error?.message };

      const saveResult = await this.saveSaOrderDetails(refId, result.data || []);
      return { success: true, count: saveResult.details.length, hasChanges: saveResult.hasChanges };
    } catch (error: any) {
      return { success: false, count: 0, hasChanges: false, error: error.message };
    }
  }

  private async fetchSaOrderDetailsAfterSync(
    records: any[],
    token: string,
    apiConfig: MisaApiConfig,
    dataSource: MisaDataSource,
    addLog: SyncLogger,
    syncStats?: SyncResult
  ): Promise<{ ordersWithDetailChanges: Array<{ code: string; name: string }> }> {
    const baseUrl = dataSource.apiEndpoint || apiConfig.baseUrl || '';
    const saOrderMatch = baseUrl.match(/(.+\/sa_order)\/.+/);
    let detailApiUrl = '';

    if (saOrderMatch) {
      detailApiUrl = saOrderMatch[1] + '/get_paging_detail';
    } else if (baseUrl.includes('/sa_order')) {
      detailApiUrl = baseUrl.replace(/\/$/, '') + '/get_paging_detail';
    }

    if (!detailApiUrl) {
      await addLog('warning', `Không thể xác định URL API chi tiết`);
      return { ordersWithDetailChanges: [] };
    }

    const refNoToRefId = new Map<string, string>();
    const refIdToOrderInfo = new Map<string, { code: string; name: string }>();
    for (const r of records) {
      if (r.refno && r.refid) {
        refNoToRefId.set(r.refno, r.refid);
        refIdToOrderInfo.set(r.refid, { code: r.refno, name: r.account_object_name || '' });
      }
    }

    const activeWorkflowStatuses = ['draft', 'waiting_export', 'in_preparation', 'in_delivery', 'in_installation'];
    const allRefIds = [...refNoToRefId.values()];

    const activeOrders = await this.saOrderRepository
      .createQueryBuilder('order')
      .select(['order.refId', 'order.refNo', 'order.accountObjectName', 'order.orderWorkflowStatus'])
      .where('order.refId IN (:...refIds)', { refIds: allRefIds })
      .andWhere('order.orderWorkflowStatus IN (:...statuses)', { statuses: activeWorkflowStatuses })
      .getMany();

    for (const order of activeOrders) {
      refIdToOrderInfo.set(order.refId, { code: order.refNo, name: order.accountObjectName || '' });
    }

    const activeRefIds = new Set(activeOrders.map(o => o.refId));
    const refIdsToFetch = new Set<string>();

    if (syncStats?.changedDetails) {
      const createdCodes = new Set(syncStats.changedDetails.created.map(c => c.code));
      const updatedCodes = new Set(syncStats.changedDetails.updated.map(u => u.code));

      for (const [refNo, refId] of refNoToRefId) {
        if (createdCodes.has(refNo) || updatedCodes.has(refNo)) refIdsToFetch.add(refId);
      }
    }

    for (const refId of activeRefIds) refIdsToFetch.add(refId);

    if (refIdsToFetch.size === 0) {
      await addLog('info', 'Không có đơn hàng nào cần lấy chi tiết');
      return { ordersWithDetailChanges: [] };
    }

    await addLog('info', `Bắt đầu lấy chi tiết cho ${refIdsToFetch.size} đơn hàng...`);

    let totalDetails = 0, errors = 0;
    const ordersWithDetailChanges: Array<{ code: string; name: string }> = [];

    for (const refId of refIdsToFetch) {
      const result = await this.fetchAndSaveSaOrderDetails(refId, token, apiConfig, detailApiUrl);
      if (result.success) {
        totalDetails += result.count;
        if (result.hasChanges) {
          const orderInfo = refIdToOrderInfo.get(refId);
          if (orderInfo) ordersWithDetailChanges.push(orderInfo);
        }
      } else {
        errors++;
      }
    }

    await addLog(
      errors > 0 ? 'warning' : 'success',
      `Hoàn thành lấy chi tiết: ${totalDetails} dòng từ ${refIdsToFetch.size} đơn` +
      (ordersWithDetailChanges.length > 0 ? `, ${ordersWithDetailChanges.length} đơn có detail thay đổi` : '') +
      (errors > 0 ? `, ${errors} lỗi` : '')
    );

    return { ordersWithDetailChanges };
  }

  // ==================== PU ORDER QUERIES ====================

  async getPuOrders(page = 1, limit = 50, search?: string): Promise<{ data: any[]; total: number }> {
    const qb = this.puOrderRepository.createQueryBuilder('order').where('order.deletedAt IS NULL');

    if (search) {
      qb.andWhere('(order.refNo ILIKE :search OR order.accountObjectName ILIKE :search OR order.accountObjectCode ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('order.refDate', 'DESC').addOrderBy('order.refNo', 'DESC').skip((page - 1) * limit).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    // Get saOrderRefNo for orders that have saOrderId
    const saOrderIds = orders.filter(o => o.saOrderId).map(o => o.saOrderId);
    let saOrderMap = new Map<number, string>();

    if (saOrderIds.length > 0) {
      const saOrders = await this.saOrderRepository
        .createQueryBuilder('sa')
        .select(['sa.id', 'sa.refNo'])
        .where('sa.id IN (:...ids)', { ids: saOrderIds })
        .getMany();

      saOrderMap = new Map(saOrders.map(sa => [sa.id, sa.refNo]));
    }

    // Merge saOrderRefNo into orders
    const data = orders.map(order => {
      (order as any).saOrderRefNo = order.saOrderId ? saOrderMap.get(order.saOrderId) || null : null;
      return order;
    });

    return { data, total };
  }

  async getPuOrderById(id: number): Promise<MisaPuOrder | null> {
    return this.puOrderRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async getPuOrderByRefId(refId: string): Promise<MisaPuOrder | null> {
    return this.puOrderRepository.findOne({ where: { refId, deletedAt: IsNull() } });
  }

  async getPuOrderDetailsByRefId(refId: string): Promise<MisaPuOrderDetail[]> {
    return this.puOrderDetailRepository.find({ where: { refId, deletedAt: IsNull() }, order: { sortOrder: 'ASC' } });
  }

  async getPuOrderWithDetails(id: number): Promise<{ order: MisaPuOrder | null; details: MisaPuOrderDetail[] }> {
    const order = await this.getPuOrderById(id);
    if (!order) return { order: null, details: [] };
    const details = await this.getPuOrderDetailsByRefId(order.refId);
    return { order, details };
  }

  // ==================== PU ORDER LOCAL FIELDS ====================

  async updatePuOrderLocalFields(
    id: number,
    data: {
      expectedArrivalDate?: string | null;
      purchaseRequisitionId?: number | null;
      saOrderId?: number | null;
      localNotes?: string | null;
    },
    updatedById?: number,
    updatedByName?: string,
  ): Promise<MisaPuOrder | null> {
    const order = await this.getPuOrderById(id);
    if (!order) return null;

    // Update fields
    if (data.expectedArrivalDate !== undefined) {
      order.expectedArrivalDate = data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : null;
      // If expected date is set and status is 'new', change to 'waiting_goods'
      if (order.expectedArrivalDate && order.localStatus === 'new') {
        order.localStatus = 'waiting_goods';
      }
    }
    if (data.purchaseRequisitionId !== undefined) {
      order.purchaseRequisitionId = data.purchaseRequisitionId;
    }
    if (data.saOrderId !== undefined) {
      order.saOrderId = data.saOrderId;
    }
    if (data.localNotes !== undefined) {
      order.localNotes = data.localNotes;
    }

    // Track who updated
    if (updatedById) order.updatedById = updatedById;
    if (updatedByName) order.updatedByName = updatedByName;

    await this.puOrderRepository.save(order);

    // Send notification if status changed to waiting_goods
    if (order.localStatus === 'waiting_goods' && data.expectedArrivalDate) {
      await this.sendPuOrderNotification(order, 'waiting_goods');
    }

    return order;
  }

  async confirmPuOrderArrival(
    id: number,
    confirmedById: number,
    confirmedByName: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string; order?: MisaPuOrder }> {
    const order = await this.getPuOrderById(id);
    if (!order) return { success: false, message: 'Không tìm thấy đơn mua hàng' };

    if (order.localStatus === 'goods_arrived') {
      return { success: false, message: 'Đơn hàng đã được xác nhận hàng về trước đó' };
    }

    // Update status
    order.localStatus = 'goods_arrived';
    order.confirmedArrivalDate = new Date();
    order.confirmedById = confirmedById;
    order.confirmedByName = confirmedByName;
    if (notes) {
      order.localNotes = order.localNotes ? `${order.localNotes}\n[Xác nhận hàng về] ${notes}` : `[Xác nhận hàng về] ${notes}`;
    }

    await this.puOrderRepository.save(order);

    // Send notification to Sa Order watchers
    await this.sendPuOrderNotification(order, 'goods_arrived');

    // Tự động xác nhận mua hàng cho đề xuất mua hàng liên kết (nếu có)
    if (order.purchaseRequisitionId) {
      try {
        const requisition = await this.purchaseRequisitionRepository.findOne({
          where: { id: Number(order.purchaseRequisitionId) },
        });
        if (requisition && requisition.status === 'approved') {
          await this.purchaseRequisitionRepository.update(requisition.id, {
            status: 'purchase_confirmed',
            purchaseConfirmedByEmployeeId: confirmedById,
            purchaseConfirmedAt: new Date(),
            purchaseConfirmNotes: notes || `Tự động xác nhận khi hàng về - ${order.refNo}`,
          });
          this.logger.log(`[PU Order] Tự động xác nhận mua hàng cho DXMH #${requisition.id} khi xác nhận hàng về đơn ${order.refNo}`);
        }
      } catch (e) {
        this.logger.error(`[PU Order] Lỗi khi tự động xác nhận DXMH #${order.purchaseRequisitionId}: ${e.message}`);
      }
    }

    return { success: true, message: 'Đã xác nhận hàng về thành công', order };
  }

  private async sendPuOrderNotification(order: MisaPuOrder, event: 'waiting_goods' | 'goods_arrived'): Promise<void> {
    try {
      // Chỉ gửi thông báo khi có liên kết với DXMH (purchaseRequisitionId)
      if (!order.purchaseRequisitionId) {
        this.logger.log(`[PU Order] Không gửi thông báo cho đơn ${order.refNo}: DXMH chưa được liên kết`);
        return;
      }

      // Get Sa Order if linked
      let saOrder: MisaSaOrder | null = null;
      if (order.saOrderId) {
        saOrder = await this.getSaOrderById(order.saOrderId);
      }

      if (event === 'waiting_goods') {
        // Gửi thông báo khi nhập thông tin hàng về (chờ hàng)
        await this.notificationHelper.notifyPuOrderWaitingGoods(
          order,
          saOrder,
          order.updatedByName || 'Hệ thống'
        );
        this.logger.log(`[PU Order] Đã gửi thông báo chờ hàng về cho đơn ${order.refNo}`);
      } else if (event === 'goods_arrived') {
        // Gửi thông báo khi xác nhận hàng đã về
        await this.notificationHelper.notifyPuOrderGoodsArrived(
          order,
          saOrder,
          order.confirmedByName || 'Hệ thống'
        );
        this.logger.log(`[PU Order] Đã gửi thông báo hàng đã về cho đơn ${order.refNo}`);
      }
    } catch (error) {
      this.logger.error('Error sending PU order notification:', error);
    }
  }

  async savePuOrderDetails(refId: string, detailsData: Record<string, any>[]): Promise<{ details: MisaPuOrderDetail[]; hasChanges: boolean; stats: { added: number; removed: number; updated: number } }> {
    const oldDetails = await this.puOrderDetailRepository.find({ where: { refId } });
    const newDetails: MisaPuOrderDetail[] = [];

    for (let i = 0; i < detailsData.length; i++) {
      const detailEntity = this.puOrderDetailRepository.create(MisaPuOrderDetail.fromMisaResponse(refId, detailsData[i], i));
      newDetails.push(detailEntity);
    }

    const stats = this.comparePuDetailChanges(oldDetails, newDetails);
    const hasChanges = stats.added > 0 || stats.removed > 0 || stats.updated > 0;

    if (hasChanges) {
      await this.puOrderDetailRepository.delete({ refId });
      if (newDetails.length > 0) await this.puOrderDetailRepository.save(newDetails);
    }

    return { details: newDetails, hasChanges, stats };
  }

  private comparePuDetailChanges(oldDetails: MisaPuOrderDetail[], newDetails: MisaPuOrderDetail[]): { added: number; removed: number; updated: number } {
    const oldMap = new Map<number, MisaPuOrderDetail>();
    for (const d of oldDetails) oldMap.set(d.sortOrder, d);

    let added = 0, updated = 0;

    for (const newDetail of newDetails) {
      const oldDetail = oldMap.get(newDetail.sortOrder);
      if (!oldDetail) {
        added++;
      } else {
        if (this.isPuDetailChanged(oldDetail, newDetail)) updated++;
        oldMap.delete(newDetail.sortOrder);
      }
    }

    return { added, removed: oldMap.size, updated };
  }

  private isPuDetailChanged(oldDetail: MisaPuOrderDetail, newDetail: MisaPuOrderDetail): boolean {
    const fieldsToCompare = ['inventoryItemCode', 'description', 'quantity', 'quantityReceipt', 'unitPrice', 'amountOc', 'stockCode', 'unitName'];
    for (const field of fieldsToCompare) {
      const oldVal = (oldDetail as any)[field];
      const newVal = (newDetail as any)[field];
      if (typeof oldVal === 'number' || typeof newVal === 'number') {
        if (Number(oldVal) !== Number(newVal)) return true;
      } else if (oldVal !== newVal) return true;
    }
    return false;
  }

  // ==================== PU ORDER DETAIL FETCHING ====================

  private buildPuOrderDetailRequestBody(refId: string): Record<string, any> {
    return {
      columns: [2157, 1355, 5274, 3870, 3895, 5279, 308, 5364, 5350, 3404, 2358],
      sort: '[{"property":4555,"desc":false,"data_type":4,"operand":1}]',
      filter: [{ property: 3993, operator: 7, operand: 1, value: refId, data_type: 10 }],
      pageIndex: 1,
      pageSize: 50,
      useSp: false,
      view: 92,
      summaryColumns: [3488, 3870, 3895, 3896, 308, 5350],
      loadMode: 2,
    };
  }

  private async fetchAndSavePuOrderDetails(refId: string, token: string, apiConfig: MisaApiConfig, detailApiUrl: string): Promise<{ success: boolean; count: number; hasChanges: boolean; error?: string }> {
    try {
      const orderExists = await this.puOrderRepository.findOne({ where: { refId } });
      if (!orderExists) return { success: false, count: 0, hasChanges: false, error: 'Order không tồn tại' };

      const requestBody = this.buildPuOrderDetailRequestBody(refId);
      const result = await this.misaApiService.callMisaApi(detailApiUrl, requestBody, token, apiConfig);

      if (!result.success) return { success: false, count: 0, hasChanges: false, error: result.error?.message };

      const saveResult = await this.savePuOrderDetails(refId, result.data || []);
      return { success: true, count: saveResult.details.length, hasChanges: saveResult.hasChanges };
    } catch (error: any) {
      return { success: false, count: 0, hasChanges: false, error: error.message };
    }
  }

  async fetchPuOrderDetailsAfterSync(
    records: any[],
    token: string,
    apiConfig: MisaApiConfig,
    dataSource: MisaDataSource,
    addLog: SyncLogger,
    syncStats?: SyncResult
  ): Promise<{ ordersWithDetailChanges: Array<{ code: string; name: string }> }> {
    const baseUrl = dataSource.apiEndpoint || apiConfig.baseUrl || '';
    const puOrderMatch = baseUrl.match(/(.+\/pu_order)\/.+/);
    let detailApiUrl = '';

    if (puOrderMatch) {
      detailApiUrl = puOrderMatch[1] + '/get_paging_detail';
    } else if (baseUrl.includes('/pu_order')) {
      detailApiUrl = baseUrl.replace(/\/$/, '') + '/get_paging_detail';
    }

    if (!detailApiUrl) {
      await addLog('warning', `Không thể xác định URL API chi tiết đơn mua hàng`);
      return { ordersWithDetailChanges: [] };
    }

    const refNoToRefId = new Map<string, string>();
    const refIdToOrderInfo = new Map<string, { code: string; name: string }>();
    for (const r of records) {
      if (r.refno && r.refid) {
        refNoToRefId.set(r.refno, r.refid);
        refIdToOrderInfo.set(r.refid, { code: r.refno, name: r.account_object_name || '' });
      }
    }

    const refIdsToFetch = new Set<string>();

    if (syncStats?.changedDetails) {
      const createdCodes = new Set(syncStats.changedDetails.created.map(c => c.code));
      const updatedCodes = new Set(syncStats.changedDetails.updated.map(u => u.code));

      for (const [refNo, refId] of refNoToRefId) {
        if (createdCodes.has(refNo) || updatedCodes.has(refNo)) refIdsToFetch.add(refId);
      }
    }

    // Nếu không có thay đổi từ syncStats, fetch tất cả
    if (refIdsToFetch.size === 0) {
      for (const refId of refNoToRefId.values()) {
        refIdsToFetch.add(refId);
      }
    }

    if (refIdsToFetch.size === 0) {
      await addLog('info', 'Không có đơn mua hàng nào cần lấy chi tiết');
      return { ordersWithDetailChanges: [] };
    }

    await addLog('info', `Bắt đầu lấy chi tiết cho ${refIdsToFetch.size} đơn mua hàng...`);

    let totalDetails = 0, errors = 0;
    const ordersWithDetailChanges: Array<{ code: string; name: string }> = [];

    for (const refId of refIdsToFetch) {
      const result = await this.fetchAndSavePuOrderDetails(refId, token, apiConfig, detailApiUrl);
      if (result.success) {
        totalDetails += result.count;
        if (result.hasChanges) {
          const orderInfo = refIdToOrderInfo.get(refId);
          if (orderInfo) ordersWithDetailChanges.push(orderInfo);
        }
      } else {
        errors++;
      }
    }

    await addLog(
      errors > 0 ? 'warning' : 'success',
      `Hoàn thành lấy chi tiết: ${totalDetails} dòng từ ${refIdsToFetch.size} đơn mua hàng` +
      (ordersWithDetailChanges.length > 0 ? `, ${ordersWithDetailChanges.length} đơn có detail thay đổi` : '') +
      (errors > 0 ? `, ${errors} lỗi` : '')
    );

    return { ordersWithDetailChanges };
  }

  // ==================== MANUAL ORDER CREATION ====================

  async createManualOrder(data: {
    refNo: string;
    refDate?: Date;
    accountObjectId?: string;
    accountObjectName?: string;
    accountObjectCode?: string;
    accountObjectAddress?: string;
    accountObjectTaxCode?: string;
    journalMemo?: string;
    requestedDeliveryDate?: Date;
    goodsStatus?: string;
    machineType?: string;
    region?: string;
    priority?: string;
    saleType?: string;
    receiverName?: string;
    receiverPhone?: string;
    specificAddress?: string;
    details?: Array<{
      inventoryItemCode: string;
      description?: string;
      stockCode?: string;
      unitName?: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number;
    }>;
  }): Promise<{ success: boolean; message: string; order?: MisaSaOrder; details?: MisaSaOrderDetail[] }> {
    const existingOrder = await this.saOrderRepository.findOne({ where: { refNo: data.refNo, deletedAt: IsNull() } });
    if (existingOrder) return { success: false, message: `Đơn hàng với số ${data.refNo} đã tồn tại trong hệ thống` };

    let totalAmountOc = 0, totalVatAmount = 0;
    if (data.details?.length) {
      for (const detail of data.details) {
        const amount = detail.quantity * detail.unitPrice;
        totalAmountOc += amount;
        totalVatAmount += amount * (detail.vatRate || 0) / 100;
      }
    }

    const refId = uuidv4();

    const manualOrder = this.saOrderRepository.create({
      refId,
      refNo: data.refNo,
      refType: 3520,
      refDate: data.refDate || new Date(),
      accountObjectId: data.accountObjectId || null,
      accountObjectName: data.accountObjectName || null,
      accountObjectCode: data.accountObjectCode || null,
      accountObjectAddress: data.accountObjectAddress || null,
      accountObjectTaxCode: data.accountObjectTaxCode || null,
      journalMemo: data.journalMemo || null,
      totalAmountOc,
      totalSaleAmountOc: totalAmountOc,
      totalVatAmount,
      receivableAmount: totalAmountOc + totalVatAmount,
      receivableAmountOc: totalAmountOc + totalVatAmount,
      requestedDeliveryDate: data.requestedDeliveryDate || null,
      goodsStatus: data.goodsStatus || null,
      machineType: data.machineType || null,
      region: data.region || null,
      priority: data.priority || null,
      saleType: data.saleType || null,
      receiverName: data.receiverName || null,
      receiverPhone: data.receiverPhone || null,
      specificAddress: data.specificAddress || null,
      source: 'manual',
      orderWorkflowStatus: 'draft',
    });

    try {
      const savedOrder = await this.saOrderRepository.save(manualOrder);

      let savedDetails: MisaSaOrderDetail[] = [];
      if (data.details?.length) {
        const orderDetails = data.details.map((detail, index) => {
          const amount = detail.quantity * detail.unitPrice;
          return this.saOrderDetailRepository.create({
            refId,
            inventoryItemCode: detail.inventoryItemCode,
            description: detail.description || null,
            stockCode: detail.stockCode || null,
            unitName: detail.unitName || null,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            amountOc: amount,
            vatRate: detail.vatRate || 0,
            vatAmountOc: amount * (detail.vatRate || 0) / 100,
            sortOrder: index,
          });
        });
        savedDetails = await this.saOrderDetailRepository.save(orderDetails);
      }

      return { success: true, message: `Đã tạo đơn hàng thủ công ${data.refNo}`, order: savedOrder, details: savedDetails };
    } catch (error: any) {
      return { success: false, message: `Lỗi tạo đơn hàng: ${error.message}` };
    }
  }

  // ==================== MANUAL PURCHASE ORDER CREATION ====================

  async createManualPurchaseOrder(data: {
    refNo: string;
    refDate?: Date;
    accountObjectId?: string;
    accountObjectName?: string;
    accountObjectCode?: string;
    accountObjectAddress?: string;
    accountObjectTaxCode?: string;
    journalMemo?: string;
    expectedArrivalDate?: Date;
    purchaseRequisitionId?: number;
    saOrderId?: number;
    localNotes?: string;
    details?: Array<{
      inventoryItemCode: string;
      description?: string;
      stockCode?: string;
      unitName?: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number;
    }>;
  }): Promise<{ success: boolean; message: string; order?: MisaPuOrder; details?: MisaPuOrderDetail[] }> {
    const existingOrder = await this.puOrderRepository.findOne({ where: { refNo: data.refNo, deletedAt: IsNull() } });
    if (existingOrder) return { success: false, message: `Đơn mua hàng với số ${data.refNo} đã tồn tại trong hệ thống` };

    let totalAmountOc = 0, totalVatAmount = 0;
    if (data.details?.length) {
      for (const detail of data.details) {
        const amount = detail.quantity * detail.unitPrice;
        totalAmountOc += amount;
        totalVatAmount += amount * (detail.vatRate || 0) / 100;
      }
    }

    const refId = uuidv4();

    const manualOrder = this.puOrderRepository.create({
      refId,
      refNo: data.refNo,
      refType: 301,
      refDate: data.refDate || new Date(),
      status: 1, // 1 = Chưa thực hiện
      accountObjectId: data.accountObjectId || null,
      accountObjectName: data.accountObjectName || null,
      accountObjectCode: data.accountObjectCode || null,
      accountObjectAddress: data.accountObjectAddress || null,
      accountObjectTaxCode: data.accountObjectTaxCode || null,
      journalMemo: data.journalMemo || null,
      totalAmountOc,
      totalAmount: totalAmountOc,
      totalVatAmount,
      totalVatAmountOc: totalVatAmount,
      totalOrderAmount: totalAmountOc + totalVatAmount,
      expectedArrivalDate: data.expectedArrivalDate || null,
      purchaseRequisitionId: data.purchaseRequisitionId || null,
      saOrderId: data.saOrderId || null,
      localNotes: data.localNotes || null,
      localStatus: data.expectedArrivalDate ? 'waiting_goods' : 'new',
    });

    try {
      const savedOrder = await this.puOrderRepository.save(manualOrder);

      let savedDetails: MisaPuOrderDetail[] = [];
      if (data.details?.length) {
        const orderDetails = data.details.map((detail, index) => {
          const amount = detail.quantity * detail.unitPrice;
          return this.puOrderDetailRepository.create({
            refId,
            inventoryItemCode: detail.inventoryItemCode,
            description: detail.description || null,
            stockCode: detail.stockCode || null,
            unitName: detail.unitName || null,
            quantity: detail.quantity,
            quantityReceipt: 0,
            unitPrice: detail.unitPrice,
            amountOc: amount,
            vatRate: detail.vatRate || 0,
            vatAmountOc: amount * (detail.vatRate || 0) / 100,
            sortOrder: index,
          });
        });
        savedDetails = await this.puOrderDetailRepository.save(orderDetails);
      }

      return { success: true, message: `Đã tạo đơn mua hàng thủ công ${data.refNo}`, order: savedOrder, details: savedDetails };
    } catch (error: any) {
      return { success: false, message: `Lỗi tạo đơn mua hàng: ${error.message}` };
    }
  }

  // ==================== DELEGATED WORKFLOW METHODS ====================

  async submitOrderForApproval(
    orderId: number,
    employeeId: number,
    employeeName: string,
    needsAdditionalOrder?: boolean,
    additionalOrderNote?: string
  ) {
    return this.workflowService.submitOrderForApproval(orderId, employeeId, employeeName, needsAdditionalOrder, additionalOrderNote);
  }

  async approveOrRejectOrder(
    orderId: number,
    employeeId: number,
    employeeName: string,
    approved: boolean,
    note?: string
  ) {
    return this.workflowService.approveOrRejectOrder(orderId, employeeId, employeeName, approved, note);
  }

  async recordWorkflowHistory(data: {
    orderId: number;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    performedByEmployeeId: number;
    performedByName?: string | null;
    notes?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    return this.workflowService.recordWorkflowHistory(data);
  }

  async getWorkflowHistory(orderId: number) {
    return this.workflowService.getWorkflowHistory(orderId);
  }

  async getSaOrdersByWorkflowStatus(status: string, page = 1, limit = 50) {
    return this.workflowService.getSaOrdersByWorkflowStatus(status, page, limit);
  }

  // ==================== DELEGATED ASSIGNMENT METHODS ====================

  async createAssignment(data: {
    orderId: number;
    taskType: string;
    assignedToId: number;
    assignedById: number;
    scheduledAt?: Date;
    notes?: string;
  }) {
    return this.assignmentService.createAssignment(data);
  }

  async getAssignmentsByOrderId(orderId: number) {
    return this.assignmentService.getAssignmentsByOrderId(orderId);
  }

  async getAssignmentById(id: number) {
    return this.assignmentService.getAssignmentById(id);
  }

  async startAssignment(assignmentId: number, employeeId: number) {
    return this.assignmentService.startAssignment(assignmentId, employeeId);
  }

  async completeAssignment(assignmentId: number, employeeId: number, data: { completionNotes?: string; attachments?: string[] }) {
    return this.assignmentService.completeAssignment(assignmentId, employeeId, data);
  }

  async markAssignmentIncomplete(assignmentId: number, employeeId: number, data: { incompleteReason: string; attachments?: string[] }) {
    return this.assignmentService.markAssignmentIncomplete(assignmentId, employeeId, data);
  }

  async reassignTask(assignmentId: number, reassignById: number, data: { newAssignedToId: number; reassignReason: string; scheduledAt?: Date; notes?: string }) {
    return this.assignmentService.reassignTask(assignmentId, reassignById, data);
  }

  async retryAssignment(assignmentId: number, retryById: number, data: { notes?: string; scheduledAt?: Date }) {
    return this.assignmentService.retryAssignment(assignmentId, retryById, data);
  }

  async retryTaskGroup(orderId: number, taskType: string, retryById: number, data: { retryEmployeeIds: number[]; newEmployeeIds: number[]; notes?: string }) {
    return this.assignmentService.retryTaskGroup(orderId, taskType, retryById, data);
  }

  async createDailyReport(assignmentId: number, employeeId: number, data: { status: string; progressPercent?: number; description: string; blockedReason?: string; attachments?: string[] }) {
    return this.assignmentService.createDailyReport(assignmentId, employeeId, data);
  }

  async getReportsByAssignmentId(assignmentId: number) {
    return this.assignmentService.getReportsByAssignmentId(assignmentId);
  }

  async getReportsByOrderId(orderId: number) {
    return this.assignmentService.getReportsByOrderId(orderId);
  }

  async markAssignmentBlocked(assignmentId: number, employeeId: number, data: { blockedReason: string; attachments?: string[] }) {
    return this.assignmentService.markAssignmentBlocked(assignmentId, employeeId, data);
  }

  async resumeAssignment(assignmentId: number, employeeId: number, data?: { notes?: string }) {
    return this.assignmentService.resumeAssignment(assignmentId, employeeId, data);
  }

  async confirmOrderCompletion(orderId: number, employeeId: number, note?: string) {
    return this.workflowService.confirmOrderCompletion(orderId, employeeId, note);
  }

  async deleteAssignment(assignmentId: number, deletedById: number) {
    return this.assignmentService.deleteAssignment(assignmentId, deletedById);
  }
}
