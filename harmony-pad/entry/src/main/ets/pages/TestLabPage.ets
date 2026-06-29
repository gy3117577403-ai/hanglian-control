import common from '@ohos.app.ability.common';
import fs from '@ohos.file.fs';
import fileUri from '@ohos.file.fileuri';
import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { ApiClient } from '../services/ApiClient';
import { BuildInfo } from '../services/BuildInfo';
import { CatalogService } from '../services/CatalogService';
import { TokenStorageService } from '../services/TokenStorageService';
import { UploadService } from '../services/UploadService';
import {
  DocumentType,
  ProductOption,
  RequiredProcess,
  SelectedUploadFile,
  UploadDocumentInput
} from '../models/DocumentModels';
import { UserInfo } from '../models/AuthModels';

interface TestItem {
  name: string;
  status: string;
  message: string;
}

interface IdEntity {
  id?: string;
  productId?: string;
  customerId?: string;
  documentId?: string;
}

interface IdResponse {
  id?: string;
  productId?: string;
  customerId?: string;
  documentId?: string;
  data?: IdEntity;
  item?: IdEntity;
}

interface PreviewResponse {
  previewStatus?: string;
  pages?: object[];
}

interface FieldQaResult {
  success: boolean;
  tests: TestItem[];
}

interface UploadQaResult {
  success: boolean;
  pngUpload: boolean;
  pngPreview: boolean;
  pdfUpload: boolean;
  pdfPreview: boolean;
  uploadUriScheme: string;
  message: string;
}

interface CustomerCreatePayload {
  name: string;
  code: string;
  salesOwner: string;
}

interface ProductCreatePayload {
  customerId: string;
  productCode: string;
  productModel: string;
  productName: string;
  currentVersion: string;
  processSegment: string;
}

interface ConnectorCreatePayload {
  connectorModel: string;
  insertionLength: number;
  outerStripLength: number;
  innerStripLength: number;
  remark: string;
  status: string;
}

@Entry
@Component
struct TestLabPage {
  @State private backendStatus: string = '待测试';
  @State private loginStatus: string = '未登录';
  @State private currentUser: string = '-';
  @State private currentProduct: string = '-';
  @State private running: boolean = false;
  @State private uploadQaStatus: string = '上传自测未运行';
  @State private buildCommit: string = BuildInfo.COMMIT;
  @State private buildTime: string = BuildInfo.BUILD_TIME;
  @State private appVersion: string = BuildInfo.APP_VERSION;
  @State private apiBaseUrl: string = BuildInfo.snapshot().apiBaseUrl;
  @State private statusText: string = '点击一键真机自检开始。';
  @State private tests: TestItem[] = [
    { name: '登录状态', status: '未测试', message: '' },
    { name: '当前用户', status: '未测试', message: '' },
    { name: '客户列表', status: '未测试', message: '' },
    { name: '新增客户', status: '未测试', message: '' },
    { name: '产品列表', status: '未测试', message: '' },
    { name: '新增产品', status: '未测试', message: '' },
    { name: '今日订单', status: '未测试', message: '' },
    { name: '连接器列表', status: '未测试', message: '' },
    { name: '新增连接器', status: '未测试', message: '' },
    { name: '删除连接器', status: '未测试', message: '' },
    { name: '回收站', status: '未测试', message: '' },
    { name: '产品资料', status: '未测试', message: '' },
    { name: '创建图片文件', status: '未测试', message: '' },
    { name: '上传图片资料', status: '未测试', message: '' },
    { name: '图片预览', status: '未测试', message: '' },
    { name: '创建PDF文件', status: '未测试', message: '' },
    { name: '上传PDF资料', status: '未测试', message: '' },
    { name: 'PDF预览', status: '未测试', message: '' }
  ];

  private qaCustomerId: string = '';
  private qaProductId: string = '';
  private qaConnectorId: string = '';
  private imageDocumentId: string = '';
  private pdfDocumentId: string = '';

  aboutToAppear(): void {
    BuildInfo.log();
    void this.loadEnvironment();
  }

  private uiContext(): common.UIAbilityContext {
    return getContext(this) as common.UIAbilityContext;
  }

  private async loadEnvironment(): Promise<void> {
    try {
      const userInfo = await TokenStorageService.getUserInfo();
      this.loginStatus = userInfo ? '已登录' : '未登录';
      this.currentUser = this.userName(userInfo);
    } catch (error) {
      this.loginStatus = '未登录';
      this.currentUser = '-';
    }

    try {
      const products = await CatalogService.getProducts();
      const product = products.length > 0 ? products[0] : undefined;
      this.currentProduct = product ? this.productModel(product) : '-';
    } catch (error) {
      console.error('[HanglianPad] test lab load products failed', error);
      this.currentProduct = '-';
    }
  }

  private userName(userInfo: UserInfo | undefined): string {
    if (!userInfo) return '-';
    return userInfo.displayName ?? userInfo.name ?? userInfo.username ?? '-';
  }

  private productModel(product: ProductOption): string {
    if (product.productCode && product.productCode.length > 0) return product.productCode;
    if (product.productName && product.productName.length > 0) return product.productName;
    return '-';
  }

  private idOf(value: IdResponse): string {
    return value.id ?? value.productId ?? value.customerId ?? value.documentId ??
      value.data?.id ?? value.data?.productId ?? value.data?.customerId ?? value.data?.documentId ??
      value.item?.id ?? value.item?.productId ?? value.item?.customerId ?? value.item?.documentId ?? '';
  }

  private setTest(name: string, passed: boolean, message: string): void {
    this.tests = this.tests.map((item: TestItem): TestItem => {
      if (item.name !== name) return item;
      return {
        name: item.name,
        status: passed ? '通过' : '失败',
        message
      };
    });
  }

  private setSkipped(name: string, message: string): void {
    this.tests = this.tests.map((item: TestItem): TestItem => {
      if (item.name !== name) return item;
      return {
        name: item.name,
        status: '通过',
        message
      };
    });
  }

  private async runCheck(name: string, action: () => Promise<void>): Promise<void> {
    this.setTest(name, false, '正在测试...');
    try {
      await action();
      this.setTest(name, true, '正常');
    } catch (error) {
      console.error('[HanglianPad] test lab check failed', name, error);
      this.setTest(name, false, '请查看日志');
    }
  }

  private async runAll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.statusText = '正在执行现场功能自检...';
    this.backendStatus = '待测试';
    const stamp = `${Date.now()}`;
    let pngFile: SelectedUploadFile | undefined = undefined;
    let pdfFile: SelectedUploadFile | undefined = undefined;
    let pngUpload = false;
    let pngPreview = false;
    let pdfUpload = false;
    let pdfPreview = false;
    let uploadUriScheme = 'none';

    await this.runCheck('登录状态', async () => {
      const hasSession = await TokenStorageService.hasSession();
      if (!hasSession) throw new Error('not logged in');
      this.loginStatus = '已登录';
    });
    await this.runCheck('当前用户', async () => {
      await ApiClient.get<object>('/auth/me');
      this.backendStatus = '正常';
    });
    await this.runCheck('客户列表', async () => {
      await ApiClient.get<object>('/customers');
    });
    await this.runCheck('新增客户', async () => {
      const payload: CustomerCreatePayload = {
        name: `现场自检客户-${stamp}`,
        code: `FIELD-CUS-${stamp}`,
        salesOwner: '现场自检'
      };
      const customer = await ApiClient.post<IdResponse>('/customers', payload);
      this.qaCustomerId = this.idOf(customer);
      if (this.qaCustomerId.length === 0) throw new Error('customer id missing');
    });
    await this.runCheck('产品列表', async () => {
      const products = await CatalogService.getProducts();
      if (products.length > 0) {
        this.qaProductId = products[0].id;
        this.currentProduct = this.productModel(products[0]);
      }
    });
    await this.runCheck('新增产品', async () => {
      if (this.qaCustomerId.length === 0) throw new Error('customer missing');
      const model = `FIELD-HL-${stamp}`;
      const payload: ProductCreatePayload = {
        customerId: this.qaCustomerId,
        productCode: model,
        productModel: model,
        productName: `现场线束产品-${stamp}`,
        currentVersion: 'V1.0',
        processSegment: '通用'
      };
      const product = await ApiClient.post<IdResponse>('/products', payload);
      this.qaProductId = this.idOf(product);
      this.currentProduct = model;
      if (this.qaProductId.length === 0) throw new Error('product id missing');
    });
    await this.runCheck('今日订单', async () => {
      await ApiClient.get<object>('/orders/today');
    });
    await this.runCheck('连接器列表', async () => {
      await ApiClient.get<object>('/connector-params');
    });
    await this.runCheck('新增连接器', async () => {
      const payload: ConnectorCreatePayload = {
        connectorModel: `FIELD-CONN-${stamp}`,
        insertionLength: 10,
        outerStripLength: 5,
        innerStripLength: 3,
        remark: '现场自检',
        status: 'active'
      };
      const connector = await ApiClient.post<IdResponse>('/connector-params', payload);
      this.qaConnectorId = this.idOf(connector);
      if (this.qaConnectorId.length === 0) throw new Error('connector id missing');
    });
    await this.runCheck('删除连接器', async () => {
      if (this.qaConnectorId.length === 0) throw new Error('connector missing');
      await ApiClient.delete<object>(`/connector-params/${encodeURIComponent(this.qaConnectorId)}`);
    });
    await this.runCheck('回收站', async () => {
      await ApiClient.get<object>('/recycle-bin');
    });
    await this.runCheck('产品资料', async () => {
      if (this.qaProductId.length === 0) throw new Error('product missing');
      await ApiClient.get<object>(`/products/${encodeURIComponent(this.qaProductId)}/documents`);
    });
    await this.runCheck('创建图片文件', async () => {
      pngFile = this.createPngFile(`field-image-${stamp}.png`);
    });
    await this.runCheck('上传图片资料', async () => {
      if (!pngFile) throw new Error('png missing');
      uploadUriScheme = this.uriScheme(pngFile.uploadUri);

      this.imageDocumentId = await this.uploadFile(pngFile, 'finished_detail_image', `现场图片资料-${stamp}`);

      pngUpload = this.imageDocumentId.length > 0;
    });
    await this.runCheck('图片预览', async () => {
      if (this.imageDocumentId.length === 0) throw new Error('image document missing');
      await this.waitForPreview(this.imageDocumentId);

      pngPreview = true;
    });
    await this.runCheck('创建PDF文件', async () => {
      pdfFile = this.createPdfFile(`field-pdf-${stamp}.pdf`);
    });
    await this.runCheck('上传PDF资料', async () => {
      if (!pdfFile) throw new Error('pdf missing');
      uploadUriScheme = this.uriScheme(pdfFile.uploadUri);

      this.pdfDocumentId = await this.uploadFile(pdfFile, 'drawing_pdf', `现场PDF资料-${stamp}`);

      pdfUpload = this.pdfDocumentId.length > 0;
    });
    await this.runCheck('PDF预览', async () => {
      if (this.pdfDocumentId.length === 0) throw new Error('pdf document missing');
      await this.waitForPreview(this.pdfDocumentId);

      pdfPreview = true;
    });

    const success = this.tests.filter((item: TestItem) => item.status === '失败').length === 0;
    this.statusText = success ? '自检完成，全部通过。' : '自检完成，存在失败项。';
    this.running = false;
    const result: FieldQaResult = {
      success,
      tests: this.tests
    };
    console.info('[HanglianPad] FIELD_QA_RESULT ' + JSON.stringify(result));
    this.emitUploadQaResult({
      success: pngUpload && pngPreview && pdfUpload && pdfPreview,
      pngUpload,
      pngPreview,
      pdfUpload,
      pdfPreview,
      uploadUriScheme,
      message: pngUpload && pngPreview && pdfUpload && pdfPreview ? '全部通过' : '存在失败项'
    });
  }

  private async uploadFile(file: SelectedUploadFile, documentType: DocumentType, title: string): Promise<string> {
    if (this.qaProductId.length === 0) throw new Error('product missing');
    const process: RequiredProcess = 'common';
    const input: UploadDocumentInput = {
      productId: this.qaProductId,
      productModel: this.currentProduct,
      category: documentType === 'drawing_pdf' ? 'original_drawing' : 'finished_image',
      documentType,
      title,
      version: 'V1.0',
      requiredForProcess: process,
      keywords: 'field-qa',
      remark: 'MatePad field QA',
      file
    };
    return UploadService.uploadDocument(this.uiContext(), input);
  }

  private emitUploadQaResult(result: UploadQaResult): void {
    this.uploadQaStatus = result.success ? '上传自测通过' : '上传自测失败';
    console.info('[HanglianPad] FIELD_UPLOAD_QA_RESULT ' + JSON.stringify(result));
  }

  private uriScheme(value: string): string {
    const index = value.indexOf(':');
    if (index <= 0) return 'path';
    return value.substring(0, index);
  }

  private async ensureUploadProduct(stamp: string): Promise<void> {
    if (this.qaProductId.length > 0) return;

    const products = await CatalogService.getProducts();
    if (products.length > 0) {
      this.qaProductId = products[0].id;
      this.currentProduct = this.productModel(products[0]);
      return;
    }

    const customerPayload: CustomerCreatePayload = {
      name: `FIELD-UPLOAD-CUSTOMER-${stamp}`,
      code: `FIELD-UPLOAD-CUS-${stamp}`,
      salesOwner: 'FIELD-QA'
    };
    const customer = await ApiClient.post<IdResponse>('/customers', customerPayload);
    this.qaCustomerId = this.idOf(customer);
    if (this.qaCustomerId.length === 0) throw new Error('customer id missing');

    const model = `FIELD-UPLOAD-${stamp}`;
    const productPayload: ProductCreatePayload = {
      customerId: this.qaCustomerId,
      productCode: model,
      productModel: model,
      productName: `FIELD-UPLOAD-PRODUCT-${stamp}`,
      currentVersion: 'V1.0',
      processSegment: 'common'
    };
    const product = await ApiClient.post<IdResponse>('/products', productPayload);
    this.qaProductId = this.idOf(product);
    this.currentProduct = model;
    if (this.qaProductId.length === 0) throw new Error('product id missing');
  }

  private async runUploadSelfTest(kind: string): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.uploadQaStatus = kind === 'png' ? '图片上传自测中...' : 'PDF 上传自测中...';
    const stamp = `${Date.now()}`;
    const result: UploadQaResult = {
      success: false,
      pngUpload: false,
      pngPreview: false,
      pdfUpload: false,
      pdfPreview: false,
      uploadUriScheme: 'none',
      message: ''
    };

    try {
      await this.ensureUploadProduct(stamp);
      if (kind === 'png') {
        const file = this.createPngFile(`field-single-image-${stamp}.png`);
        result.uploadUriScheme = this.uriScheme(file.uploadUri);
        const documentId = await this.uploadFile(file, 'finished_detail_image', `FIELD-UPLOAD-IMAGE-${stamp}`);
        result.pngUpload = documentId.length > 0;
        await this.waitForPreview(documentId);
        result.pngPreview = true;
      } else {
        const file = this.createPdfFile(`field-single-pdf-${stamp}.pdf`);
        result.uploadUriScheme = this.uriScheme(file.uploadUri);
        const documentId = await this.uploadFile(file, 'drawing_pdf', `FIELD-UPLOAD-PDF-${stamp}`);
        result.pdfUpload = documentId.length > 0;
        await this.waitForPreview(documentId);
        result.pdfPreview = true;
      }
      result.success = kind === 'png' ? result.pngUpload && result.pngPreview : result.pdfUpload && result.pdfPreview;
      result.message = result.success ? '通过' : '失败';
    } catch (error) {
      console.error('[HanglianPad] upload self test failed', error);
      result.message = '失败';
    } finally {
      this.running = false;
      this.emitUploadQaResult(result);
    }
  }

  private async waitForPreview(documentId: string): Promise<void> {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const preview = await ApiClient.get<PreviewResponse>(`/documents/${encodeURIComponent(documentId)}/preview`);
      if (preview.previewStatus === 'ready') {
        return;
      }
      if (preview.previewStatus === 'failed') {
        throw new Error('preview failed');
      }
      await new Promise<void>((resolve: () => void) => setTimeout(resolve, 2000));
    }
    throw new Error('preview timeout');
  }

  private createPngFile(fileName: string): SelectedUploadFile {
    const bytes: number[] = [
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 252, 207, 192, 80,
      15, 0, 5, 131, 2, 127, 151, 15, 73, 63, 0, 0, 0, 0, 73, 69,
      78, 68, 174, 66, 96, 130
    ];
    const cachePath = `${this.uiContext().cacheDir}/${fileName}`;
    this.writeBytes(cachePath, bytes);
    return {
      uri: cachePath,
      uploadUri: `internal://cache/${fileName}`,
      fallbackUploadUri: fileUri.getUriFromPath(cachePath),
      cachePath,
      name: fileName,
      mimeType: 'image/png',
      size: bytes.length,
      source: 'test_lab'
    };
  }

  private createPdfFile(fileName: string): SelectedUploadFile {
    const bytes: number[] = [
      37, 80, 68, 70, 45, 49, 46, 52, 10, 49, 32, 48, 32, 111, 98, 106, 10,
      60, 60, 32, 47, 84, 121, 112, 101, 32, 47, 67, 97, 116, 97, 108, 111,
      103, 32, 47, 80, 97, 103, 101, 115, 32, 50, 32, 48, 32, 82, 32, 62, 62,
      10, 101, 110, 100, 111, 98, 106, 10, 50, 32, 48, 32, 111, 98, 106, 10,
      60, 60, 32, 47, 84, 121, 112, 101, 32, 47, 80, 97, 103, 101, 115, 32,
      47, 75, 105, 100, 115, 32, 91, 51, 32, 48, 32, 82, 93, 32, 47, 67, 111,
      117, 110, 116, 32, 49, 32, 62, 62, 10, 101, 110, 100, 111, 98, 106, 10,
      51, 32, 48, 32, 111, 98, 106, 10, 60, 60, 32, 47, 84, 121, 112, 101,
      32, 47, 80, 97, 103, 101, 32, 47, 80, 97, 114, 101, 110, 116, 32, 50,
      32, 48, 32, 82, 32, 47, 77, 101, 100, 105, 97, 66, 111, 120, 32, 91,
      48, 32, 48, 32, 51, 54, 48, 32, 49, 54, 48, 93, 32, 47, 82, 101, 115,
      111, 117, 114, 99, 101, 115, 32, 60, 60, 32, 47, 70, 111, 110, 116,
      32, 60, 60, 32, 47, 70, 49, 32, 53, 32, 48, 32, 82, 32, 62, 62, 32,
      62, 62, 32, 47, 67, 111, 110, 116, 101, 110, 116, 115, 32, 52, 32, 48,
      32, 82, 32, 62, 62, 10, 101, 110, 100, 111, 98, 106, 10, 52, 32, 48,
      32, 111, 98, 106, 10, 60, 60, 32, 47, 76, 101, 110, 103, 116, 104, 32,
      53, 49, 32, 62, 62, 10, 115, 116, 114, 101, 97, 109, 10, 66, 84, 32,
      47, 70, 49, 32, 50, 48, 32, 84, 102, 32, 51, 54, 32, 57, 54, 32, 84,
      100, 32, 40, 72, 97, 114, 109, 111, 110, 121, 32, 70, 105, 101, 108,
      100, 32, 80, 68, 70, 32, 69, 50, 69, 41, 32, 84, 106, 32, 69, 84, 10,
      101, 110, 100, 115, 116, 114, 101, 97, 109, 10, 101, 110, 100, 111, 98,
      106, 10, 53, 32, 48, 32, 111, 98, 106, 10, 60, 60, 32, 47, 84, 121,
      112, 101, 32, 47, 70, 111, 110, 116, 32, 47, 83, 117, 98, 116, 121,
      112, 101, 32, 47, 84, 121, 112, 101, 49, 32, 47, 66, 97, 115, 101, 70,
      111, 110, 116, 32, 47, 72, 101, 108, 118, 101, 116, 105, 99, 97, 32,
      62, 62, 10, 101, 110, 100, 111, 98, 106, 10, 120, 114, 101, 102, 10,
      48, 32, 54, 10, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 32, 54, 53,
      53, 51, 53, 32, 102, 32, 10, 48, 48, 48, 48, 48, 48, 48, 48, 48, 57,
      32, 48, 48, 48, 48, 48, 32, 110, 32, 10, 48, 48, 48, 48, 48, 48, 48,
      48, 53, 56, 32, 48, 48, 48, 48, 48, 32, 110, 32, 10, 48, 48, 48, 48,
      48, 48, 48, 49, 49, 53, 32, 48, 48, 48, 48, 48, 32, 110, 32, 10, 48,
      48, 48, 48, 48, 48, 48, 50, 52, 49, 32, 48, 48, 48, 48, 48, 32, 110,
      32, 10, 48, 48, 48, 48, 48, 48, 48, 51, 52, 50, 32, 48, 48, 48, 48,
      48, 32, 110, 32, 10, 116, 114, 97, 105, 108, 101, 114, 10, 60, 60, 32,
      47, 83, 105, 122, 101, 32, 54, 32, 47, 82, 111, 111, 116, 32, 49, 32,
      48, 32, 82, 32, 62, 62, 10, 115, 116, 97, 114, 116, 120, 114, 101,
      102, 10, 52, 49, 50, 10, 37, 37, 69, 79, 70, 10
    ];
    const cachePath = `${this.uiContext().cacheDir}/${fileName}`;
    this.writeBytes(cachePath, bytes);
    return {
      uri: cachePath,
      uploadUri: `internal://cache/${fileName}`,
      fallbackUploadUri: fileUri.getUriFromPath(cachePath),
      cachePath,
      name: fileName,
      mimeType: 'application/pdf',
      size: bytes.length,
      source: 'test_lab'
    };
  }

  private writeText(filePath: string, content: string): void {
    const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE);
    try {
      fs.writeSync(file.fd, content);
    } finally {
      fs.closeSync(file);
    }
  }

  private writeBytes(filePath: string, bytes: number[]): void {
    const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE);
    try {
      const buffer = new ArrayBuffer(bytes.length);
      const view = new Uint8Array(buffer);
      for (let index = 0; index < bytes.length; index += 1) {
        view[index] = bytes[index];
      }
      fs.writeSync(file.fd, buffer);
    } finally {
      fs.closeSync(file);
    }
  }

  private openPage(label: string, url: string): void {
    console.info('[HanglianPad] test lab open page', label);
    router.pushUrl({ url })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] test lab route failed', error);
        this.statusText = '页面打开失败，请稍后重试。';
      });
  }

  private openUploadPage(): void {
    console.info('[HanglianPad] test lab open upload');
    router.pushUrl({
      url: 'pages/DocumentUploadPage',
      params: {
        productModel: this.currentProduct,
        title: '原图'
      }
    }).catch((error: BusinessError) => {
      console.error('[HanglianPad] test lab upload route failed', error);
      this.statusText = '页面打开失败，请稍后重试。';
    });
  }

  private returnWorkbench(): void {
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] test lab return failed', error);
        this.statusText = '返回失败，请稍后重试。';
      });
  }

  private statusColor(status: string): string {
    if (status === '通过' || status === '正常' || status === '已登录') return '#2F6B4F';
    if (status === '失败' || status === '异常') return '#B91C1C';
    return '#9C5725';
  }

  build() {
    Column({ space: 12 }) {
      Row({ space: 10 }) {
        Text('现场功能自检')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .layoutWeight(1)
        Button('一键真机自检')
          .height(46)
          .width(140)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => {
            void this.runAll();
          })
        Button('返回工作台')
          .height(46)
          .width(120)
          .backgroundColor('#342316')
          .fontColor(Color.White)
          .onClick(() => {
            this.returnWorkbench();
          })
      }
      .width('100%')
      .height(82)
      .padding({ left: 16, right: 16 })
      .backgroundColor('#FFF4DE')
      .border({ width: 1, color: '#70482336', radius: 8 })

      Row({ space: 12 }) {
        this.EnvCard('后端连接', this.backendStatus);
        this.EnvCard('登录状态', this.loginStatus);
        this.EnvCard('当前用户', this.currentUser);
        this.EnvCard('当前产品', this.currentProduct);
      }
      .height(92)
      .width('100%')
      Row({ space: 12 }) {
        this.EnvCard('commit', this.buildCommit);
        this.EnvCard('buildTime', this.buildTime);
        this.EnvCard('appVersion', this.appVersion);
        this.EnvCard('API', this.apiBaseUrl);
      }
      .height(92)
      .width('100%')

      Row({ space: 10 }) {
        Button('打开客户与产品')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => this.openPage('客户与产品', 'pages/CustomerProductPage'))
        Button('打开连接器参数')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => this.openPage('连接器参数', 'pages/ConnectorParamPage'))
        Button('打开回收站')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#8F3F1D')
          .fontColor(Color.White)
          .onClick(() => this.openPage('回收站', 'pages/RecycleBinPage'))
        Button('打开订单总览')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#614C8A')
          .fontColor(Color.White)
          .onClick(() => this.openPage('订单总览', 'pages/OrderOverviewPage'))
        Button('打开上传页')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#9C5725')
          .fontColor(Color.White)
          .onClick(() => this.openUploadPage())
      }
      .width('100%')

      Row({ space: 10 }) {
        Button('真机上传 PNG 自测')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => {
            void this.runUploadSelfTest('png');
          })
        Button('真机上传 PDF 自测')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#614C8A')
          .fontColor(Color.White)
          .onClick(() => {
            void this.runUploadSelfTest('pdf');
          })
        Text(this.uploadQaStatus)
          .height(50)
          .layoutWeight(2)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#6F5845')
          .padding({ left: 14, right: 14, top: 14, bottom: 10 })
          .backgroundColor('#FFF8EC')
          .borderRadius(8)
      }
      .width('100%')

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.tests, (item: TestItem) => {
            Row({ space: 10 }) {
              Text(item.name)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor('#342316')
                .layoutWeight(1)
              Text(item.status)
                .width(82)
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .textAlign(TextAlign.Center)
                .padding({ top: 8, bottom: 8 })
                .backgroundColor(this.statusColor(item.status))
                .borderRadius(6)
              Text(item.message.length > 0 ? item.message : '未测试')
                .width(220)
                .fontSize(14)
                .fontColor('#76512A')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .height(64)
            .width('100%')
            .padding({ left: 12, right: 12 })
            .backgroundColor('#FFFCF4')
            .border({ width: 1, color: '#70482324', radius: 8 })
          }, (item: TestItem) => item.name)
        }
      }
      .layoutWeight(1)
      .width('100%')

      Text(this.statusText)
        .width('100%')
        .height(42)
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor('#6F5845')
        .padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .backgroundColor('#FFF8EC')
        .borderRadius(8)
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private EnvCard(label: string, value: string) {
    Column({ space: 8 }) {
      Text(label)
        .fontSize(13)
        .fontWeight(FontWeight.Bold)
        .fontColor('#76512A')
      Text(value)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .alignItems(HorizontalAlign.Start)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }
}
