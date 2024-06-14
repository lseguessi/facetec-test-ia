//
// Welcome to the annotated FaceTec Device SDK core code for performing secure Liveness Checks!
//

import { Config } from "../../Config";
import { FaceTecSDK } from "../../../core-sdk/FaceTecSDK.js/FaceTecSDK";
import type { FaceTecSessionResult, FaceTecFaceScanResultCallback, FaceTecFaceScanProcessor } from "../../../core-sdk/FaceTecSDK.js/FaceTecPublicApi";
import axios from 'axios';

//
// This is an example self-contained class to perform Liveness Checks with the FaceTec SDK.
// You may choose to further componentize parts of this in your own Apps based on your specific requirements.
//
export class LivenessCheckProcessor implements FaceTecFaceScanProcessor {
  latestSessionResult: FaceTecSessionResult | null;

  //
  // DEVELOPER NOTE:  These properties are for demonstration purposes only so the Sample App can get information about what is happening in the processor.
  // In the code in your own App, you can pass around signals, flags, intermediates, and results however you would like.
  //
  success: boolean;
  sampleAppControllerReference: any;

  constructor(sessionToken: string, sampleAppControllerReference: any) {
    //
    // DEVELOPER NOTE:  These properties are for demonstration purposes only so the Sample App can get information about what is happening in the processor.
    // In the code in your own App, you can pass around signals, flags, intermediates, and results however you would like.
    //
    this.success = false;
    this.sampleAppControllerReference = sampleAppControllerReference;
    this.latestSessionResult = null;

    //
    // Part 1:  Starting the FaceTec Session
    //
    // Required parameters:
    // - FaceTecFaceScanProcessor:  A class that implements FaceTecFaceScanProcessor, which handles the FaceScan when the User completes a Session.  In this example, "this" implements the class.
    // - sessionToken:  A valid Session Token you just created by calling your API to get a Session Token from the Server SDK.
    //
    new FaceTecSDK.FaceTecSession(
      this,
      sessionToken
    );
  }

  //
  // Part 2:  Handling the Result of a FaceScan
  //
  public processSessionResultWhileFaceTecSDKWaits(sessionResult: FaceTecSessionResult, faceScanResultCallback: FaceTecFaceScanResultCallback): void {
    // Save the current sessionResult
    this.latestSessionResult = sessionResult;

    //
    // Part 3:  Handles early exit scenarios where there is no FaceScan to handle -- i.e. User Cancellation, Timeouts, etc.
    //
    if(sessionResult.status !== FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully) {
      console.log("Session was not completed successfully, cancelling.  Session Status: " + FaceTecSDK.FaceTecSessionStatus[sessionResult.status]);
      faceScanResultCallback.cancel();
      return;
    }

    // IMPORTANT:  FaceTecSDK.FaceTecSessionStatus.SessionCompletedSuccessfully DOES NOT mean the Liveness Check was Successful.
    // It simply means the User completed the Session and a 3D FaceScan was created.  You still need to perform the Liveness Check on your Servers.

    //
    // Part 4:  Get essential data off the FaceTecSessionResult
    //
    const parameters = {
      faceScan: sessionResult.faceScan,
      auditTrailImage: sessionResult.auditTrail[0],
      lowQualityAuditTrailImage: sessionResult.lowQualityAuditTrail[0],
      sessionId: sessionResult.sessionId
    };

    //
    // Part 5:  Make the Networking Call to Your Servers.  Below is just example code, you are free to customize based on how your own API works.
    //
    axios.post(`${Config.BaseURL}/liveness-3d`, parameters, {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Key": Config.DeviceKeyIdentifier,
        "X-User-Agent": FaceTecSDK.createFaceTecAPIUserAgentString(sessionResult.sessionId as string)
      },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.loaded / progressEvent.total;
        faceScanResultCallback.uploadProgress(progress);
      }
    }).then(response => {
      const responseJSON = response.data;
      const scanResultBlob = responseJSON.scanResultBlob;

      if(responseJSON.wasProcessed) {
        FaceTecSDK.FaceTecCustomization.setOverrideResultScreenSuccessMessage("Liveness\nConfirmed");
        faceScanResultCallback.proceedToNextStep(scanResultBlob);
      } else {
        console.log("Unexpected API response, cancelling out.");
        faceScanResultCallback.cancel();
      }
    }).catch(error => {
      console.log("Exception while handling API response, cancelling out.", error);
      faceScanResultCallback.cancel();
    });

    //
    // Part 9:  For better UX, update the User if the upload is taking a while.  You are free to customize and enhance this behavior to your liking.
    //
    window.setTimeout(() => {
      if(!this.latestSessionResult) {
        return;
      }

      faceScanResultCallback.uploadMessageOverride("Still Uploading...");
    }, 6000);
  }

  //
  // Part 10:  This function gets called after the FaceTec SDK is completely done.  There are no parameters because you have already been passed all data in the processSessionWhileFaceTecSDKWaits function and have already handled all of your own results.
  //
  public onFaceTecSDKCompletelyDone = (): void => {
    //
    // DEVELOPER NOTE:  onFaceTecSDKCompletelyDone() is called after you signal the FaceTec SDK with success() or cancel().
    // Calling a custom function on the Sample App Controller is done for demonstration purposes to show you that here is where you get control back from the FaceTec SDK.
    //
    this.success = this.latestSessionResult!.isCompletelyDone;
    this.sampleAppControllerReference.onComplete(this.latestSessionResult, null, 200); // Note that Axios handles the status internally, so you don't have direct access to it here
  };

  //
  // DEVELOPER NOTE:  This public convenience method is for demonstration purposes only so the Sample App can get information about what is happening in the processor.
  // In your code, you may not even want or need to do this.
  //
  public isSuccess = (): boolean => {
    return this.success;
  };
}
