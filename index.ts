import axios from 'axios';

interface Config {
  DeviceKeyIdentifier: string;
  PublicFaceScanEncryptionKey: string;
  BaseURL: string;
}

interface FaceTecSDK {
  setResourceDirectory(directory: string): void;
  setImagesDirectory(directory: string): void;
  initializeInDevelopmentMode(deviceKey: string, publicKey: string, callback: (initializedSuccessfully: boolean) => void): void;
  getFriendlyDescriptionForFaceTecSDKStatus(status: number): string;
  getStatus(): number;
  createFaceTecAPIUserAgentString(s: string): string;
}

interface SampleAppUtilities {
  enableAllButtons(): void;
  displayStatus(status: string): void;
  fadeOutMainUIAndPrepareForSession(): void;
  showMainUI(): void;
  formatUIForDevice(): void;
  handleErrorGettingServerSessionToken(): void;
}

declare const Config: Config;
declare const FaceTecSDK: FaceTecSDK;
declare const SampleAppUtilities: SampleAppUtilities;

class SampleApp {
  private static latestEnrollmentIdentifier = "";
  private static latestSessionResult: any = null;
  private static latestIDScanResult: any = null;
  private static latestProcessor: any;

  public static init(): void {
    window.onload = SampleApp.initializeSDK;
  }

  private static initializeSDK(): void {
    FaceTecSDK.setResourceDirectory("../../core-sdk/FaceTecSDK.js/resources");
    FaceTecSDK.setImagesDirectory("../../core-sdk/FaceTec_images");

    FaceTecSDK.initializeInDevelopmentMode(Config.DeviceKeyIdentifier, Config.PublicFaceScanEncryptionKey, (initializedSuccessfully: boolean) => {
      if (initializedSuccessfully) {
        SampleAppUtilities.enableAllButtons();
      }
      SampleAppUtilities.displayStatus(FaceTecSDK.getFriendlyDescriptionForFaceTecSDKStatus(FaceTecSDK.getStatus()));
    });

    SampleAppUtilities.formatUIForDevice();
  }

  public static onLivenessCheckPressed(): void {
    SampleAppUtilities.fadeOutMainUIAndPrepareForSession();
    SampleApp.getSessionToken((sessionToken: string) => {
      SampleApp.latestProcessor = new LivenessCheckProcessor(sessionToken, SampleApp);
    });
  }

  public static onComplete(): void {
    SampleAppUtilities.showMainUI();
    SampleAppUtilities.enableAllButtons();

    if (!SampleApp.latestProcessor.isSuccess()) {
      SampleApp.latestEnrollmentIdentifier = "";
      SampleAppUtilities.displayStatus("Session exited early, see logs for more details.");
      return;
    }

    SampleAppUtilities.displayStatus("Success");
  }

  private static async getSessionToken(sessionTokenCallback: (sessionToken: string) => void): Promise<void> {
    try {
      const response = await axios.get(Config.BaseURL + "/session-token", {
        headers: {
          'X-Device-Key': Config.DeviceKeyIdentifier,
          'X-User-Agent': FaceTecSDK.createFaceTecAPIUserAgentString("")
        }
      });

      const sessionToken = response.data.sessionToken;

      if (typeof sessionToken !== 'string') {
        SampleApp.onServerSessionTokenError();
        return;
      }

      sessionTokenCallback(sessionToken);
    } catch (error) {
      SampleApp.onServerSessionTokenError();
    }
  }

  private static onServerSessionTokenError(): void {
    SampleAppUtilities.handleErrorGettingServerSessionToken();
  }

  public static setLatestSessionResult(sessionResult: any): void {
    SampleApp.latestSessionResult = sessionResult;
  }

  public static setIDScanResult(idScanResult: any): void {
    SampleApp.latestIDScanResult = idScanResult;
  }

  public static getLatestEnrollmentIdentifier(): string {
    return SampleApp.latestEnrollmentIdentifier;
  }

  public static setLatestServerResult(responseJSON: any): void {
    // Implement this function as needed
  }
}

SampleApp.init();

export default SampleApp;
