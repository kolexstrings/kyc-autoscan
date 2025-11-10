import { useState, useEffect } from "react";
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
  capturedSelfies: string[];
  maxSelfies?: number;
}

export default function FaceAutoCapture({
  onPhotoTaken,
  onError,
  onBack,
  capturedSelfies = [],
  maxSelfies = 4
}: Props) {
  const [currentSelfieIndex, setCurrentSelfieIndex] = useState(capturedSelfies.length);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<CallbackImage<FaceComponentData> | null>(null);

  const totalSelfies = maxSelfies;
  const isComplete = currentSelfieIndex >= totalSelfies;

  const handlePhotoTaken: FaceCallback = async (imageData, content) => {
    if (isCapturing) return; // Prevent multiple captures

    setIsCapturing(true);
    setIsButtonDisabled(false);
    setCapturedPhoto(imageData);

    try {
      // Call parent callback
      await onPhotoTaken(imageData, content);

      // If not complete, start countdown for next selfie
      if (currentSelfieIndex + 1 < totalSelfies) {
        setCountdown(3); // 3 second delay
      }
    } catch (err) {
      console.error('Error in photo taken handler:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleContinueDetection = () => {
    setCapturedPhoto(null);
    dispatchControlEvent(
      FaceCustomEvent.CONTROL,
      ControlEventInstruction.CONTINUE_DETECTION,
    );
    setIsButtonDisabled(true);
    setCurrentSelfieIndex(prev => prev + 1);
    setCountdown(null);
  };

  const handleManualContinue = () => {
    if (countdown !== null) {
      setCountdown(null);
    }
    handleContinueDetection();
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-continue when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      handleContinueDetection();
    }
  }, [countdown]);

  const getLivenessInstructions = (index: number) => {
    const instructions = [
      "Position your face within the frame. Keep still and look directly at the camera.",
      "Slightly tilt your head to the left or right for the next photo.",
      "Change your facial expression (smile or blink) for better liveness detection.",
      "Move slightly closer or further from the camera for the final photo."
    ];
    return instructions[index] || "Position your face within the frame.";
  };

  if (isComplete) {
    return (
      <div className="capture-screen">
        <h2>Selfie Capture Complete!</h2>
        <p>All {totalSelfies} selfies have been captured successfully.</p>

        <div className="completion-content">
          <div className="selfies-grid">
            {capturedSelfies.map((dataUrl, index) => (
              <div key={index} className="selfie-thumbnail">
                <img src={dataUrl} alt={`Selfie ${index + 1}`} />
                <span className="selfie-number">#{index + 1}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={onBack}>
            Continue to Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="capture-screen">
      <div className="capture-header">
        <h2>Capture Selfies ({currentSelfieIndex + 1}/{totalSelfies})</h2>
        <div className="progress-indicator">
          <span>Progress:</span>
          <div className="progress-dots">
            {Array.from({ length: totalSelfies }, (_, i) => (
              <div
                key={i}
                className={`progress-dot ${
                  i < currentSelfieIndex ? 'completed' :
                  i === currentSelfieIndex ? 'active' : ''
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="variation-reminder" role="status" aria-live="polite">
        <strong>Slight changes help passive liveness.</strong>
        <span>
          After each capture, tilt your head, adjust expression, or move a little so every selfie looks slightly different.
        </span>
      </div>

      {/* Captured Selfies Preview */}
      {capturedSelfies.length > 0 && (
        <div className="captured-selfies">
          <h3>Captured Selfies</h3>
          <div className="selfies-preview-grid">
            {capturedSelfies.map((dataUrl, index) => (
              <div key={index} className="selfie-preview-item">
                <img src={dataUrl} alt={`Selfie ${index + 1}`} />
                <span className="selfie-index">#{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                candidate_selection: getLivenessInstructions(currentSelfieIndex),
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

      {/* Liveness Instructions */}
      <div className="liveness-tip">
        <h4>Liveness Detection Tip</h4>
        <p>{getLivenessInstructions(currentSelfieIndex)}</p>
        <p className="tip-note">
          Taking multiple photos with slight variations helps ensure your verification passes liveness checks.
        </p>
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
              onClick={handleManualContinue}
              className="btn-primary"
              disabled={countdown !== null}
            >
              {countdown !== null ? (
                `Continue in ${countdown}s`
              ) : (
                'Continue Detection'
              )}
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
