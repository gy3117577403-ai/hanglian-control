<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Camera, CameraOff, ImagePlus, RefreshCcw } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const fallbackInput = ref<HTMLInputElement | null>(null)
const stream = ref<MediaStream | null>(null)
const pendingFile = ref<File | null>(null)
const pendingUrl = ref('')
const cameraError = ref('')

function safeId() {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)
}

function timestampName() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

function revokePending() {
  if (pendingUrl.value) URL.revokeObjectURL(pendingUrl.value)
  pendingUrl.value = ''
  pendingFile.value = null
}

function stopCamera() {
  stream.value?.getTracks().forEach((track) => track.stop())
  stream.value = null
  if (videoRef.value) videoRef.value.srcObject = null
  store.cameraActive = false
}

async function startCamera() {
  cameraError.value = ''
  revokePending()
  if (!navigator.mediaDevices?.getUserMedia) {
    store.cameraPermission = 'unsupported'
    cameraError.value = '当前浏览器不支持直接调用摄像头，请改用选择文件。'
    fallbackInput.value?.click()
    return
  }
  store.cameraPermission = 'prompt'
  try {
    stopCamera()
    const nextStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: 'environment',
        },
      },
      audio: false,
    })
    stream.value = nextStream
    store.cameraPermission = 'granted'
    store.cameraActive = true
    if (videoRef.value) {
      videoRef.value.srcObject = nextStream
      await videoRef.value.play()
    }
  } catch (error) {
    stopCamera()
    store.cameraPermission = 'denied'
    const name = (error as { name?: string })?.name
    cameraError.value = name === 'NotFoundError'
      ? '当前设备未检测到可用摄像头，请改用选择文件。'
      : '无法使用摄像头，请允许摄像头权限或改用选择文件。'
  }
}

async function capturePhoto() {
  const video = videoRef.value
  if (!video || !stream.value) return
  const sourceWidth = video.videoWidth || 1280
  const sourceHeight = video.videoHeight || 720
  const longSide = Math.max(sourceWidth, sourceHeight)
  const scale = longSide > 2560 ? 2560 / longSide : 1
  const width = Math.round(sourceWidth * scale)
  const height = Math.round(sourceHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  context.drawImage(video, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.88)
  })
  if (!blob) return
  revokePending()
  pendingFile.value = new File([blob], `camera-${timestampName()}-${safeId()}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
  pendingUrl.value = URL.createObjectURL(pendingFile.value)
}

function retake() {
  revokePending()
}

function usePhoto() {
  if (!pendingFile.value) return
  store.addCapturedPhoto(pendingFile.value)
  revokePending()
}

function continueCapture() {
  revokePending()
}

function handleFallback(files?: FileList | null) {
  if (!files?.length) return
  Array.from(files).forEach((file) => store.addCapturedPhoto(file))
  if (fallbackInput.value) fallbackInput.value.value = ''
}

onBeforeUnmount(() => {
  stopCamera()
  revokePending()
})
</script>

<template>
  <section class="camera-panel">
    <div class="camera-stage">
      <video v-show="store.cameraActive && !pendingUrl" ref="videoRef" autoplay playsinline muted />
      <img v-if="pendingUrl" :src="pendingUrl" alt="待使用照片" loading="lazy" decoding="async">
      <div v-if="!store.cameraActive && !pendingUrl" class="camera-empty">
        <Camera :size="34" />
        <strong>拍摄现场资料</strong>
        <span>点击拍照后才会请求摄像头权限，优先使用后置摄像头。</span>
      </div>
    </div>

    <div class="camera-actions">
      <PrimeButton v-if="!store.cameraActive" label="拍照" icon="pi pi-camera" @click="startCamera" />
      <PrimeButton v-if="store.cameraActive && !pendingUrl" label="拍照" icon="pi pi-camera" @click="capturePhoto" />
      <PrimeButton v-if="pendingUrl" severity="secondary" label="重拍" @click="retake">
        <RefreshCcw :size="16" />
      </PrimeButton>
      <PrimeButton v-if="pendingUrl" label="使用照片" @click="usePhoto">
        <ImagePlus :size="16" />
      </PrimeButton>
      <PrimeButton v-if="pendingUrl" severity="secondary" outlined label="继续拍摄" @click="continueCapture" />
      <PrimeButton v-if="store.cameraActive" severity="secondary" outlined label="关闭摄像头" @click="stopCamera">
        <CameraOff :size="16" />
      </PrimeButton>
      <PrimeButton severity="secondary" text label="选择图片" @click="fallbackInput?.click()" />
      <input
        ref="fallbackInput"
        class="hidden-input"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        @change="handleFallback(($event.target as HTMLInputElement).files)"
      >
    </div>

    <p v-if="cameraError" class="camera-error">{{ cameraError }}</p>
    <p class="camera-count">已拍摄 {{ store.capturedPhotos.length }} 张照片</p>
  </section>
</template>

<style scoped>
.camera-panel {
  display: grid;
  gap: 10px;
}

.camera-stage {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  min-height: 260px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(122, 76, 35, 0.045) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(0deg, rgba(122, 76, 35, 0.04) 1px, transparent 1px) 0 0 / 24px 24px,
    rgba(255, 255, 255, 0.3);
  box-shadow:
    0 18px 34px rgba(80, 42, 16, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.camera-stage video,
.camera-stage img {
  width: 100%;
  height: 100%;
  max-height: 360px;
  object-fit: contain;
  background: #23170e;
}

.camera-empty {
  display: grid;
  gap: 8px;
  justify-items: center;
  color: #76512a;
  text-align: center;
}

.camera-empty strong {
  color: #432713;
  font-size: 17px;
  font-weight: 950;
}

.camera-empty span,
.camera-count,
.camera-error {
  margin: 0;
  font-size: 12px;
  font-weight: 850;
}

.camera-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.camera-actions :deep(.p-button) {
  min-height: 48px;
}

.camera-error {
  color: #a23e31;
}

.camera-count {
  color: #76512a;
}

.hidden-input {
  display: none;
}
</style>
