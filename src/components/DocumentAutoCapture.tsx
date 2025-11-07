import { useState } from "react";
import type { DocumentCallback, CallbackImage, DocumentComponentData } from "@innovatrics/dot-document-auto-capture";
import {
  dispatchControlEvent,
  DocumentCustomEvent,
  ControlEventInstruction,
} from "@innovatrics/dot-document-auto-capture/events";
import DocumentCamera from "./DocumentCamera";
import DocumentUi from "./DocumentUi";

interface Props {
  onPhotoTaken: DocumentCallback;
  onError: (error: Error) => void;
  onBack: () => void;
}

export default function DocumentAutoCapture({
  onPhotoTaken,
  onError,
  onBack,
}: Props) {
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<CallbackImage<DocumentComponentData> | null>(null);
  const [capturedContent, setCapturedContent] = useState<any>(null);

  const handlePhotoTaken: DocumentCallback = async (imageData, content) => {
    setIsButtonDisabled(false);
    setCapturedPhoto(imageData);
    setCapturedContent(content);
  };

  const handleContinueDetection = () => {
    setCapturedPhoto(null);
    setCapturedContent(null);
    dispatchControlEvent(
      DocumentCustomEvent.CONTROL,
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
      <h2>Document Capture</h2>
      <p>Position your ID document in the frame and follow the instructions</p>

      <div className="capture-wrapper">
        {capturedPhoto ? (
          <div className="photo-preview">
            <img src={URL.createObjectURL(capturedPhoto.image)} alt="Captured document" />
            <div className="preview-overlay">
              <div className="preview-badge">✓ Document Captured!</div>
            </div>
          </div>
        ) : (
          <>
            <DocumentCamera
              cameraFacing="environment"
              onPhotoTaken={handlePhotoTaken}
              onError={onError}
            />
            <DocumentUi
              showCameraButtons
              instructions={{
                candidate_selection: "Position document in the frame",
                document_centering: "Center the document",
                document_not_present: "No document detected - show your ID",
                document_too_far: "Move document closer",
                sharpness_too_low: "Hold steady for sharper image",
                brightness_too_low: "Move to better lighting",
                brightness_too_high: "Reduce glare on document",
                hotspots_present: "Avoid reflections on document",
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
