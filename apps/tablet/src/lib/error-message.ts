export function friendlyErrorMessage(error: unknown, fallback = '操作失败，请稍后重试。') {
  const value = error as {
    data?: { message?: string | string[] }
    response?: { _data?: { message?: string | string[] } }
    message?: string
  }
  const raw = value?.data?.message ?? value?.response?._data?.message ?? value?.message
  const text = Array.isArray(raw) ? raw.join('；') : raw

  if (!text) return fallback
  if (/Failed to fetch|NetworkError|timeout|fetch/i.test(text)) return '后端暂时不可用，已保留当前页面状态。'
  if (/30MB|file size|too large/i.test(text)) return '文件超过 30MB，请压缩后重新上传。'
  if (/PDF|JPG|PNG|WEBP|mimetype|extension|扩展名|格式/i.test(text)) return '文件格式不支持，请上传 PDF、JPG、PNG 或 WEBP。'
  if (/path|traversal|非法|不安全/i.test(text)) return '文件名不安全，请重命名后再上传。'
  if (/not found|404|不存在/i.test(text)) return '文件或资料不存在，请刷新后重试。'
  if (/database|Prisma|Sealos|database connection url/i.test(text)) return '当前未接入真实数据库，请使用 Mock 演示流程。'
  if (text.length > 90) return fallback
  return text
}

export const errorMessages = {
  apiUnavailable: '后端暂时不可用，当前为离线演示模式。',
  uploadFailed: '资料上传失败，请检查文件格式、大小和后端状态。',
  previewFailed: '预览加载失败，可下载查看或重新上传。',
  offlineDemo: '当前为离线演示模式，部分上传能力不可用。',
  selectPlanFirst: '请先选择生产计划，再上传资料。',
}
