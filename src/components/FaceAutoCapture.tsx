import { useState } from "react";
import type { FaceCallback, CallbackImage, FaceComponentData } from "@innovatrics/dot-face-auto-capture";
import {
  dispatchControlEvent,
  FaceCustomEvent,
  ControlEventInstruction,
} from "@innovatrics/dot-face-auto-capture/events";
import FaceCamera from "./FaceCamera";
import FaceUi from "./FaceUi";

interface Props {
  onPhotoTaken: FaceCallback;
  onError: (error: Error) => void;
  onBack: () => void;
}

export default function FaceAutoCapture({
  onPhotoTaken,
  onError,
  onBack,
}: Props) {
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<CallbackImage<FaceComponentData> | null>(null);
  const [capturedContent, setCapturedContent] = useState<any>(null);

  const handlePhotoTaken: FaceCallback = async (imageData, content) => {
    setIsButtonDisabled(false);
    setCapturedPhoto(imageData);
    setCapturedContent(content);
  };

  const handleContinueDetection = () => {
    setCapturedPhoto(null);
    setCapturedContent(null);
    dispatchControlEvent(
      FaceCustomEvent.CONTROL,
      ControlEventInstruction.CONTINUE_DETECTION,
    );
    setIsButtonDisabled(true);
  };

  const handleAcceptPhoto = () => {
    if (capturedPhoto && capturedContent !== null) {
      onPhotoTaken(capturedPhoto, capturedContent);
    }
  };

  return (
    <div className="capture-screen">
      <h2>Face Capture</h2>
      <p>Position your face in the frame and follow the instructions</p>

      <div className="capture-wrapper">
        {capturedPhoto ? (
          <div className="photo-preview">
            <img src={URL.createObjectURL(capturedPhoto.image)} alt="Captured face" />
            <div className="preview-overlay">
              <div className="preview-badge">✓ Photo Captured!</div>
            </div>
          </div>
        ) : (
          <>
            <FaceCamera
              cameraFacing="user"
              onPhotoTaken={handlePhotoTaken}
              onError={onError}
            />
            <FaceUi
              showCameraButtons
              instructions={{
                candidate_selection: "Position your face in the center",
                face_too_far: "Move closer to the camera",
                face_centering: "Center your face in the frame",
                face_not_present: "No face detected - look at the camera",
                sharpness_too_low: "Hold still for a sharper image",
                brightness_too_low: "Move to a brighter area",
                brightness_too_high: "Lighting is too bright",
                device_pitched: "Hold your device straight",
              }}
            />
          </>
        )}
      </div>

      <div className="button-container">
        {!capturedPhoto && (
          <button type="button" onClick={onBack}>
            Back
          </button>
        )}
        {capturedPhoto ? (
          <>
            <button
              type="button"
              onClick={handleContinueDetection}
              className="btn-secondary"
            >
              Retake Photo
            </button>
            <button
              type="button"
              onClick={handleAcceptPhoto}
              className="btn-primary"
            >
              Accept Photo
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleContinueDetection}
            disabled={isButtonDisabled}
          >
            Continue detection
          </button>
        )}
      </div>
    </div>
  );
}
