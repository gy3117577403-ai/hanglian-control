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
    const fileStat = fs.statSync(cachePath);
    if (fileStat.size <= 0) return undefined;

    return {
      uri: resultUri,
      uploadUri: `internal://cache/${fileName}`,
      fallbackUploadUri: fileUri.getUriFromPath(cachePath),
      cachePath,
      name: fileName,
      mimeType: 'image/jpeg',
      size: fileStat.size,
      source: 'camera_capture',
      captureSource: 'environment_camera'
    };
  }
}
