import { apiBaseUrl } from '@/services/api'
import type { AuditAction, DocumentTab, DocumentTypeV03, ProductDocument, RequiredProcess } from '@/types/production'

export type PreviewFolderTab = DocumentTab | 'connector' | 'process-card'

export const documentTypeLabels: Record<DocumentTypeV03, string> = {
  drawing_pdf: 'PDF 图纸',
  sop_image: 'SOP 扫描图片',
  connector_manual: '连接器说明书',
  pinout_diagram: '插接孔位图',
  finished_detail_image: '成品细节图',
  process_card: '作业流程卡',
}

export const processLabels: Record<RequiredProcess, string> = {
  front: '前段必需',
  back: '后段必需',
  common: '通用资料',
}

export function documentTypeLabel(document?: ProductDocument | null) {
  if (!document) return '资料'
  if (document.documentType) return documentTypeLabels[document.documentType]
  const labels: Record<DocumentTab, string> = {
    drawing: 'PDF 图纸',
    sop: 'SOP 扫描图片',
    'pin-map': '插接孔位图',
    finish: '成品细节图',
  }
  return labels[document.type] ?? '资料'
}

export function tabLabel(tab: PreviewFolderTab) {
  const labels: Record<PreviewFolderTab, string> = {
    drawing: '图纸',
    sop: 'SOP',
    'pin-map': '孔位图',
    finish: '成品细节',
    connector: '连接器说明',
    'process-card': '作业流程卡',
  }
  return labels[tab]
}

export function tabIcon(tab: PreviewFolderTab) {
  const icons: Record<PreviewFolderTab, string> = {
    drawing: 'pi pi-file-pdf',
    sop: 'pi pi-images',
    'pin-map': 'pi pi-sitemap',
    finish: 'pi pi-image',
    connector: 'pi pi-wrench',
    'process-card': 'pi pi-list-check',
  }
  return icons[tab]
}

export function documentMatchesTab(document: ProductDocument, tab: PreviewFolderTab) {
  if (tab === 'drawing') return document.type === 'drawing' || document.documentType === 'drawing_pdf'
  if (tab === 'sop') return document.type === 'sop' || document.documentType === 'sop_image'
  if (tab === 'pin-map') return document.type === 'pin-map' || document.documentType === 'pinout_diagram'
  if (tab === 'finish') return document.type === 'finish' || document.documentType === 'finished_detail_image'
  if (tab === 'connector') return document.documentType === 'connector_manual'
  return document.documentType === 'process_card'
}

export function tabForDocument(document: ProductDocument): PreviewFolderTab {
  if (document.documentType === 'connector_manual') return 'connector'
  if (document.documentType === 'process_card') return 'process-card'
  return document.type
}

export function fileSizeLabel(size?: number) {
  if (!size) return 'Mock 占位'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function dateTimeLabel(value?: string) {
  if (!value) return 'Mock 生成'
  return value.replace('T', ' ').replace('.000Z', '')
}

export function resolveFileUrl(raw?: string) {
  if (!raw) return ''
  if (/^https?:\/\//.test(raw) || raw.startsWith('data:')) return raw
  const base = apiBaseUrl.replace(/\/api$/, '')
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export function processLabel(value?: RequiredProcess) {
  return value ? processLabels[value] : '通用资料'
}

export function sourceLabel(source?: string) {
  const labels: Record<string, string> = {
    mock: 'Mock 资料包',
    manual_upload: '本地上传',
    wecom_disk: '企业微信微盘',
  }
  return source ? labels[source] ?? source : '资料包'
}

export function auditActionLabel(action: AuditAction | string) {
  const labels: Record<string, string> = {
    document_uploaded: '上传资料',
    document_status_changed: '状态变更',
    document_version_changed: '版本变更',
    document_set_effective: '设为当前有效',
    document_archived: '资料归档',
    document_previewed: '资料预览',
    document_downloaded: '资料下载',
    readiness_recalculated: '完整性重算',
    migration_preview_generated: '迁移预览生成',
  }
  return labels[action] ?? action
}

export function compareFieldLabel(field: string) {
  const labels: Record<string, string> = {
    title: '标题',
    type: '类型',
    documentType: '资料类型',
    version: '版本',
    status: '状态',
    documentStatus: '状态',
    source: '来源',
    originalFileName: '文件名',
    fileSize: '文件大小',
    requiredForProcess: '适用工序',
    updatedAt: '更新时间',
    createdAt: '上传时间',
    keywords: '关键词',
    remark: '备注',
  }
  return labels[field] ?? field
}

export function mockPreviewImage(document: ProductDocument, index = 1, total = 1) {
  const title = `${document.title} ${index}/${total}`
  const subtitle = document.type === 'pin-map'
    ? '插接定位检查'
    : document.type === 'finish'
      ? '细节检查'
      : document.type === 'sop'
        ? '作业步骤扫描'
        : documentTypeLabel(document)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
      <defs>
        <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#fff8ea"/>
          <stop offset="100%" stop-color="#f2cc8c"/>
        </linearGradient>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#a66b2c" stroke-width="1" opacity=".18"/>
        </pattern>
      </defs>
      <rect width="960" height="640" rx="28" fill="url(#paper)"/>
      <rect x="36" y="36" width="888" height="568" rx="18" fill="url(#grid)" stroke="#99602a" stroke-width="3" opacity=".9"/>
      <rect x="82" y="90" width="796" height="96" rx="14" fill="#fffaf0" stroke="#ba7b37" stroke-width="2"/>
      <text x="112" y="142" font-family="Microsoft YaHei, Arial" font-size="34" font-weight="800" fill="#3a2515">${escapeSvg(title)}</text>
      <text x="112" y="172" font-family="Microsoft YaHei, Arial" font-size="20" fill="#7b5129">${escapeSvg(subtitle)} · ${escapeSvg(document.version)}</text>
      <g transform="translate(112 245)" stroke="#a15d25" stroke-width="8" stroke-linecap="round" fill="none" opacity=".72">
        <path d="M0 0 C120 80 230 -70 360 12 S600 72 720 -18"/>
        <path d="M0 96 C160 30 260 166 430 88 S590 14 720 112"/>
        <path d="M18 210 L712 210"/>
      </g>
      <g fill="#c45f24">
        <circle cx="198" cy="245" r="15"/>
        <circle cx="418" cy="257" r="15"/>
        <circle cx="642" cy="236" r="15"/>
        <circle cx="276" cy="445" r="18"/>
        <circle cx="552" cy="443" r="18"/>
      </g>
      <text x="112" y="560" font-family="Microsoft YaHei, Arial" font-size="24" font-weight="700" fill="#7b5129">演示资料图，未上传真实图片。</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
