import common from '@ohos.app.ability.common';
import fs from '@ohos.file.fs';
import fileUri from '@ohos.file.fileuri';
import camera from '@ohos.multimedia.camera';
import cameraPicker from '@ohos.multimedia.cameraPicker';
import { SelectedUploadFile } from '../models/DocumentModels';

export class CameraService {
  static async takePhoto(context: common.UIAbilityContext): Promise<SelectedUploadFile | undefined> {
    const fileName = `camera-${Date.now()}.jpg`;
    const cachePath = `${context.cacheDir}/${fileName}`;
    const cacheFile = fs.openSync(cachePath, fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE);
    fs.closeSync(cacheFile);

    const saveUri = fileUri.getUriFromPath(cachePath);
    const profile: cameraPicker.PickerProfile = {
      cameraPosition: camera.CameraPosition.CAMERA_POSITION_BACK,
      saveUri
    };
    const result = await cameraPicker.pick(context, [cameraPicker.PickerMediaType.PHOTO], profile);
    const resultUri = result?.resultUri ?? saveUri;
    let fileSize = CameraService.cacheFileSize(cachePath);
    if (fileSize <= 0 && resultUri !== saveUri) {
      CameraService.copyUriToCache(resultUri, cachePath);
      fileSize = CameraService.cacheFileSize(cachePath);
    }
    if (fileSize <= 0) {
      throw new Error('Camera photo cache file is empty.');
    }

    return {
      uri: saveUri,
      uploadUri: `internal://cache/${fileName}`,
      fallbackUploadUri: fileUri.getUriFromPath(cachePath),
      cachePath,
      name: fileName,
      mimeType: 'image/jpeg',
      size: fileSize,
      source: 'camera',
      captureSource: 'environment_camera'
    };
  }

  private static cacheFileSize(cachePath: string): number {
    try {
      return fs.statSync(cachePath).size;
    } catch {
      return 0;
    }
  }

  private static copyUriToCache(uri: string, cachePath: string): void {
    let sourceFile: fs.File | undefined = undefined;
    try {
      sourceFile = fs.openSync(uri, fs.OpenMode.READ_ONLY);
      fs.copyFileSync(sourceFile.fd, cachePath);
    } finally {
      if (sourceFile) fs.closeSync(sourceFile);
    }
  }
}
