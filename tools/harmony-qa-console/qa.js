const DEFAULT_BASE_URL = 'https://fyeboolnlvqv.sealoshzh.site/api';

const state = {
  token: '',
  customerId: '',
  productId: '',
  connectorId: '',
  documentId: ''
};

const stepsEl = document.querySelector('#steps');
const summaryEl = document.querySelector('#summary');
const runAllButton = document.querySelector('#runAll');

function valueOf(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function apiBaseUrl() {
  return (valueOf('apiBaseUrl') || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function stepRow(name, method, path) {
  const row = document.createElement('div');
  row.className = 'step';
  row.dataset.name = name;
  row.innerHTML = `
    <strong>${name}</strong>
    <span class="muted">${method}</span>
    <span class="muted">${path}</span>
    <span><span class="badge pending">未测试</span> <span class="message">等待执行</span></span>
  `;
  stepsEl.appendChild(row);
  return row;
}

function mark(row, ok, status, message) {
  const badge = row.querySelector('.badge');
  const text = row.querySelector('.message');
  badge.className = `badge ${ok ? 'pass' : 'fail'}`;
  badge.textContent = ok ? '成功' : '失败';
  text.textContent = `HTTP ${status || '-'}，${message}`;
}

function headers(json = true) {
  const result = {};
  if (json) result['Content-Type'] = 'application/json';
  if (state.token) result.Authorization = `Bearer ${state.token}`;
  return result;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl()}${path}`, options);
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { text };
    }
  }
  if (!response.ok) {
    throw { status: response.status, body };
  }
  return { status: response.status, body };
}

function firstArray(value) {
  if (Array.isArray(value)) return value;
  return value?.data ?? value?.items ?? value?.rows ?? value?.records ?? [];
}

function firstId(value) {
  return value?.id ?? value?.data?.id ?? value?.item?.id ?? '';
}

function firstDocumentId(value) {
  const documents = firstArray(value?.documents ?? value?.data?.documents ?? value);
  return documents[0]?.documentId ?? documents[0]?.id ?? '';
}

async function runStep(definition) {
  const row = stepRow(definition.name, definition.method, definition.pathLabel || definition.path);
  try {
    const result = await definition.run();
    mark(row, true, result.status, definition.success);
    return result.body;
  } catch (error) {
    console.error(`[Harmony QA] ${definition.name} failed`, error);
    mark(row, false, error.status, definition.failure);
    return undefined;
  }
}

function samplePdfFile() {
  const content = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
  return new File([content], `harmony-qa-${Date.now()}.pdf`, { type: 'application/pdf' });
}

async function uploadDocument() {
  if (!state.productId) {
    throw { status: 0, body: { message: '缺少产品，无法上传' } };
  }
  const input = document.querySelector('#uploadFile');
  const file = input.files && input.files.length > 0 ? input.files[0] : samplePdfFile();
  const form = new FormData();
  form.append('productId', state.productId);
  form.append('documentType', 'drawing_pdf');
  form.append('title', `Harmony QA 图纸 ${Date.now()}`);
  form.append('version', 'V1.0');
  form.append('status', 'effective');
  form.append('requiredForProcess', 'common');
  form.append('source', 'qa_console');
  form.append('file', file, file.name);
  return request('/documents/upload', {
    method: 'POST',
    headers: headers(false),
    body: form
  });
}

async function runAll() {
  runAllButton.disabled = true;
  stepsEl.innerHTML = '';
  summaryEl.textContent = '正在执行 API 自检...';
  state.token = '';
  state.customerId = '';
  state.productId = '';
  state.connectorId = '';
  state.documentId = '';

  const stamp = Date.now();
  const definitions = [
    {
      name: '健康检查',
      method: 'GET',
      path: '/health',
      success: '后端健康接口正常',
      failure: '健康检查失败',
      run: () => request('/health')
    },
    {
      name: '登录',
      method: 'POST',
      path: '/auth/login',
      success: '登录成功，token 已安全保存',
      failure: '登录失败，请检查账号密码',
      run: async () => {
        const result = await request('/auth/login', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ username: valueOf('username'), password: valueOf('password') })
        });
        state.token = result.body?.accessToken ?? result.body?.data?.accessToken ?? '';
        return result;
      }
    },
    {
      name: '当前用户',
      method: 'GET',
      path: '/auth/me',
      success: '当前用户接口正常',
      failure: '当前用户接口失败',
      run: () => request('/auth/me', { headers: headers(false) })
    },
    {
      name: '客户列表',
      method: 'GET',
      path: '/customers',
      success: '客户列表可读取',
      failure: '客户列表读取失败',
      run: () => request('/customers', { headers: headers(false) })
    },
    {
      name: '新增客户',
      method: 'POST',
      path: '/customers',
      success: '已创建 QA 客户',
      failure: '新增客户失败',
      run: async () => {
        const result = await request('/customers', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ name: `QA自检客户-${stamp}`, code: `QA-CUS-${stamp}`, salesOwner: 'QA' })
        });
        state.customerId = firstId(result.body);
        return result;
      }
    },
    {
      name: '产品列表',
      method: 'GET',
      path: '/products',
      success: '产品列表可读取',
      failure: '产品列表读取失败',
      run: async () => {
        const result = await request('/products', { headers: headers(false) });
        const rows = firstArray(result.body);
        if (!state.productId && rows.length > 0) state.productId = rows[0].id;
        return result;
      }
    },
    {
      name: '新增产品',
      method: 'POST',
      path: '/products',
      success: '已创建 QA 产品',
      failure: '新增产品失败',
      run: async () => {
        const result = await request('/products', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            customerId: state.customerId,
            productCode: `QA-HL-${stamp}`,
            productName: `QA线束产品-${stamp}`,
            currentVersion: 'V1.0',
            processSegment: '通用'
          })
        });
        state.productId = firstId(result.body);
        return result;
      }
    },
    {
      name: '产品资料',
      method: 'GET',
      pathLabel: '/products/:id/documents',
      success: '产品资料接口正常',
      failure: '产品资料接口失败',
      run: async () => {
        const result = await request(`/products/${encodeURIComponent(state.productId)}/documents`, { headers: headers(false) });
        state.documentId = firstDocumentId(result.body);
        return result;
      }
    },
    {
      name: '连接器列表',
      method: 'GET',
      path: '/connector-params',
      success: '连接器列表可读取',
      failure: '连接器列表读取失败',
      run: () => request('/connector-params', { headers: headers(false) })
    },
    {
      name: '新增连接器',
      method: 'POST',
      path: '/connector-params',
      success: '已创建 QA 连接器',
      failure: '新增连接器失败',
      run: async () => {
        const result = await request('/connector-params', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            connectorModel: `QA-CONN-${stamp}`,
            inputLength: '10',
            outerStripLength: '5',
            innerStripLength: '3',
            remark: 'QA自检',
            status: '启用'
          })
        });
        state.connectorId = firstId(result.body);
        return result;
      }
    },
    {
      name: '编辑连接器',
      method: 'PATCH',
      pathLabel: '/connector-params/:id',
      success: '连接器编辑接口正常',
      failure: '连接器编辑失败',
      run: () => request(`/connector-params/${encodeURIComponent(state.connectorId)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          connectorModel: `QA-CONN-${stamp}`,
          inputLength: '11',
          outerStripLength: '5',
          innerStripLength: '3',
          remark: 'QA自检已编辑',
          status: '启用'
        })
      })
    },
    {
      name: '删除连接器',
      method: 'DELETE',
      pathLabel: '/connector-params/:id',
      success: '连接器删除接口正常',
      failure: '连接器删除失败',
      run: () => request(`/connector-params/${encodeURIComponent(state.connectorId)}`, {
        method: 'DELETE',
        headers: headers(false)
      })
    },
    {
      name: '连接器导出',
      method: 'GET',
      path: '/connector-params/export',
      success: '连接器导出接口正常',
      failure: '连接器导出失败',
      run: () => request('/connector-params/export', { headers: headers(false) })
    },
    {
      name: '回收站',
      method: 'GET',
      path: '/recycle-bin',
      success: '回收站接口正常',
      failure: '回收站接口失败',
      run: () => request('/recycle-bin', { headers: headers(false) })
    },
    {
      name: '资料上传',
      method: 'POST',
      path: '/documents/upload',
      success: '上传接口正常',
      failure: '上传失败，请检查网络或文件格式',
      run: async () => {
        const result = await uploadDocument();
        state.documentId = firstId(result.body) || firstDocumentId(result.body) || state.documentId;
        return result;
      }
    },
    {
      name: '资料预览',
      method: 'GET',
      pathLabel: '/documents/:id/preview',
      success: '预览接口正常',
      failure: '预览接口失败或资料仍在转换',
      run: () => request(`/documents/${encodeURIComponent(state.documentId)}/preview`, { headers: headers(false) })
    }
  ];

  for (const definition of definitions) {
    await runStep(definition);
  }

  const failed = stepsEl.querySelectorAll('.badge.fail').length;
  summaryEl.textContent = failed === 0 ? 'API 自检完成：全部通过。' : `API 自检完成：${failed} 项失败，请查看对应步骤。`;
  runAllButton.disabled = false;
}

runAllButton.addEventListener('click', () => {
  void runAll();
});
