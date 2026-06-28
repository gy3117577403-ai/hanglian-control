import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import UIAbility from '@ohos.app.ability.UIAbility';
import Want from '@ohos.app.ability.Want';
import window from '@ohos.window';
import hilog from '@ohos.hilog';
import { BusinessError } from '@ohos.base';
import { TokenStorageService } from '../services/TokenStorageService';

const DOMAIN: number = 0x0000;
const TAG: string = 'HanglianEntryAbility';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    TokenStorageService.init(this.context);
    hilog.info(DOMAIN, TAG, 'EntryAbility created.');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    try {
      const mainWindow = windowStage.getMainWindowSync();
      mainWindow.setPreferredOrientation(window.Orientation.LANDSCAPE).catch((error: BusinessError) => {
        hilog.warn(DOMAIN, TAG, 'Failed to set landscape orientation: %{public}s', error.message);
      });
    } catch (error) {
      hilog.warn(DOMAIN, TAG, 'Landscape orientation setup skipped.');
    }

    windowStage.loadContent('pages/SplashPage', (error: BusinessError) => {
      if (error.code) {
        hilog.error(DOMAIN, TAG, 'Failed to load content: %{public}d %{public}s', error.code, error.message);
        return;
      }

      hilog.info(DOMAIN, TAG, 'SplashPage loaded.');
    });
  }
}
