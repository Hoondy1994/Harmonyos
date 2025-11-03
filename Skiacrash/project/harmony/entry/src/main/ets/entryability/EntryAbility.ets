import { AbilityConstant, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';
import { RNAbility } from '@rnoh/react-native-openharmony';

const DOMAIN = 0x0000;

export default class EntryAbility extends RNAbility {
  protected getPagePath(): string {
    return 'pages/Index';
  }
}