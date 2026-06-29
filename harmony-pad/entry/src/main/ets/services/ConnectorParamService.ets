import { ApiClient, ApiError } from './ApiClient';
import { buildId, currentTimeLabel, MockStore } from './MockData';
import { ConnectorParam, ConnectorParamStatus, ServiceResult, StatusCount } from './DomainModels';

export interface ConnectorParamPayload {
  connectorModel: string;
  inputLength: string;
  outerStripLength: string;
  innerStripLength: string;
  remark: string;
  status: ConnectorParamStatus;
}

export interface ConnectorImportOnePayload {
  connectorModel: string;
  insertionLength: number;
  outerStripLength: number;
  innerStripLength: number;
  status: string;
  remark: string;
}

function connectorErrorText(error: Object): string {
  if (error instanceof ApiError) {
    return `${error.statusCode} ${error.message} ${error.responseBody}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}

export class ConnectorParamService {
  static missingApis: string[] = [
    'GET /connector-params',
    'POST /connector-params',
    'PATCH /connector-params/:id',
    'DELETE /connector-params/:id',
    'POST /connector-params/import',
    'GET /connector-params/export',
    'POST /connector-params/import-one'
  ];

  static async list(): Promise<ServiceResult<ConnectorParam[]>> {
    try {
      const rows = await ApiClient.get<ConnectorParam[]>('/connector-params');
      return { data: rows, source: 'api', message: '已连接 GET /connector-params' };
    } catch (error) {
      return { data: MockStore.connectorParams, source: 'mock', message: '连接器参数接口缺失，使用本地 mock fallback' };
    }
  }

  static async create(payload: ConnectorParamPayload): Promise<ServiceResult<ConnectorParam>> {
    try {
      const row = await ApiClient.post<ConnectorParam>('/connector-params', payload);
      return { data: row, source: 'api', message: '已调用 POST /connector-params' };
    } catch (error) {
      const row: ConnectorParam = {
        id: buildId('CONN'),
        connectorModel: payload.connectorModel,
        inputLength: payload.inputLength,
        outerStripLength: payload.outerStripLength,
        innerStripLength: payload.innerStripLength,
        remark: payload.remark,
        status: payload.status,
        updatedAt: currentTimeLabel()
      };
      MockStore.connectorParams.unshift(row);
      return { data: row, source: 'mock', message: '新增参数已写入本地 mock fallback' };
    }
  }

  static async update(id: string, payload: ConnectorParamPayload): Promise<ServiceResult<ConnectorParam>> {
    try {
      const row = await ApiClient.patch<ConnectorParam>(`/connector-params/${encodeURIComponent(id)}`, payload);
      return { data: row, source: 'api', message: '已调用 PATCH /connector-params/:id' };
    } catch (error) {
      MockStore.connectorParams = MockStore.connectorParams.map((item: ConnectorParam) => {
        if (item.id !== id) {
          return item;
        }
        return {
          id: item.id,
          connectorModel: payload.connectorModel,
          inputLength: payload.inputLength,
          outerStripLength: payload.outerStripLength,
          innerStripLength: payload.innerStripLength,
          remark: payload.remark,
          status: payload.status,
          updatedAt: currentTimeLabel()
        };
      });
      const updated = MockStore.connectorParams.find((item: ConnectorParam) => item.id === id) ?? {
        id,
        connectorModel: payload.connectorModel,
        inputLength: payload.inputLength,
        outerStripLength: payload.outerStripLength,
        innerStripLength: payload.innerStripLength,
        remark: payload.remark,
        status: payload.status,
        updatedAt: currentTimeLabel()
      };
      return { data: updated, source: 'mock', message: '编辑参数已写入本地 mock fallback' };
    }
  }

  static async delete(id: string): Promise<ServiceResult<string>> {
    try {
      await ApiClient.delete<object>(`/connector-params/${encodeURIComponent(id)}`);
      return { data: id, source: 'api', message: '已调用 DELETE /connector-params/:id' };
    } catch (error) {
      MockStore.connectorParams = MockStore.connectorParams.filter((item: ConnectorParam) => item.id !== id);
      return { data: id, source: 'mock', message: '参数已从本地 mock fallback 删除' };
    }
  }

  static async importOne(payload: ConnectorImportOnePayload): Promise<ServiceResult<ConnectorParam>> {
    try {
      const row = await ApiClient.post<ConnectorParam>('/connector-params/import-one', payload);
      return { data: row, source: 'api', message: '已调用 POST /connector-params/import-one' };
    } catch (error) {
      const activeStatus: ConnectorParamStatus = '启用';
      const row: ConnectorParam = {
        id: buildId('CONN'),
        connectorModel: payload.connectorModel,
        inputLength: `${payload.insertionLength}`,
        outerStripLength: `${payload.outerStripLength}`,
        innerStripLength: `${payload.innerStripLength}`,
        remark: `${payload.remark}; import-one fallback: ${connectorErrorText(error)}`,
        status: activeStatus,
        updatedAt: currentTimeLabel()
      };
      MockStore.connectorParams.unshift(row);
      return { data: row, source: 'mock', message: `POST /connector-params/import-one failed: ${connectorErrorText(error)}; wrote mock fallback` };
    }
  }

  static async exportCsv(): Promise<ServiceResult<string>> {
    try {
      await ApiClient.get<object>('/connector-params/export');
      return { data: 'export responded', source: 'api', message: '已调用 GET /connector-params/export' };
    } catch (error) {
      return { data: 'export failed', source: 'mock', message: `GET /connector-params/export failed: ${connectorErrorText(error)}` };
    }
  }

  static stats(rows: ConnectorParam[]): StatusCount[] {
    return [
      { label: '启用', count: rows.filter((item: ConnectorParam) => item.status === '启用').length },
      { label: '复核', count: rows.filter((item: ConnectorParam) => item.status === '复核').length },
      { label: '停用', count: rows.filter((item: ConnectorParam) => item.status === '停用').length }
    ];
  }
}
