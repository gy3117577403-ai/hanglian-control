import { AppConfig } from './AppConfig';

export interface BuildInfoSnapshot {
  commit: string;
  buildTime: string;
  appVersion: string;
  apiBaseUrl: string;
}

export class BuildInfo {
  static readonly COMMIT: string = '39db5d2';
  static readonly BUILD_TIME: string = '2026-06-29T07:51:34.803Z';
  static readonly APP_VERSION: string = '1.0.0';

  static snapshot(): BuildInfoSnapshot {
    return {
      commit: BuildInfo.COMMIT,
      buildTime: BuildInfo.BUILD_TIME,
      appVersion: BuildInfo.APP_VERSION,
      apiBaseUrl: AppConfig.API_BASE_URL
    };
  }

  static log(): void {
    console.info('[HanglianPad] BUILD_INFO ' + JSON.stringify(BuildInfo.snapshot()));
  }
}
