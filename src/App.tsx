import { useState } from "react";
import type { DocumentCallback } from "@innovatrics/dot-document-auto-capture";
import type { FaceCallback } from "@innovatrics/dot-face-auto-capture";
import { Step } from "./types";
import DocumentAutoCapture from "./components/DocumentAutoCapture";
import FaceAutoCapture from "./components/FaceAutoCapture";
import { blobToBase64, blobToDataUri, downloadImage, generateFilename } from "./utils/imageUtils";
import "./App.css";

interface CapturedImageData {
  blob: Blob;              // Original blob from SDK
  dataUrl: string;         // Object URL for preview (blob:http://...)
  base64: string;          // Pure base64 for Innovatrics API
  dataUri: string;         // Full data URI (data:image/jpeg;base64,...)
  filename: string;        // Downloaded filename
}

interface CapturedData {
  document?: CapturedImageData;
  face?: CapturedImageData;
}

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.WELCOME);
  const [capturedData, setCapturedData] = useState<CapturedData>({});
  const [error, setError] = useState<string | null>(null);

  const handleDocumentCapture: DocumentCallback = async (imageData, _content) => {
    try {
      const blob = imageData.image;
      
      // Generate filename and download to device
      const filename = generateFilename('document');
      downloadImage(blob, filename);
      
      // Convert to all required formats
      const base64 = await blobToBase64(blob);
      const dataUri = await blobToDataUri(blob);
      const dataUrl = URL.createObjectURL(blob);
      
      // Store all formats
      const capturedImage: CapturedImageData = {
        blob,
        dataUrl,
        base64,
        dataUri,
        filename,
      };
      
      console.log('📄 Document captured:', {
        filename,
        blobSize: `${(blob.size / 1024).toFixed(2)} KB`,
        base64Length: base64.length,
        format: blob.type,
        // For Innovatrics API, send: { image: { data: base64 } }
        innovatricsFormat: { image: { data: base64 } }
      });
      
      setCapturedData((prev) => {
        const updated = { ...prev, document: capturedImage };
        if (prev.face) {
          setCurrentStep(Step.REVIEW);
        } else {
          setCurrentStep(Step.SELECT_CAPTURE);
        }
        return updated;
      });
    } catch (err) {
      setError("Failed to capture document. Please try again.");
      console.error(err);
    }
  };

  const handleFaceCapture: FaceCallback = async (imageData, _content) => {
    try {
      const blob = imageData.image;
      
      // Generate filename and download to device
      const filename = generateFilename('selfie');
      downloadImage(blob, filename);
      
      // Convert to all required formats
      const base64 = await blobToBase64(blob);
      const dataUri = await blobToDataUri(blob);
      const dataUrl = URL.createObjectURL(blob);
      
      // Store all formats
      const capturedImage: CapturedImageData = {
        blob,
        dataUrl,
        base64,
        dataUri,
        filename,
      };
      
      console.log('🤳 Selfie captured:', {
        filename,
        blobSize: `${(blob.size / 1024).toFixed(2)} KB`,
        base64Length: base64.length,
        format: blob.type,
        // For Innovatrics API, send: { image: { data: base64 } }
        innovatricsFormat: { image: { data: base64 } }
      });
      
      setCapturedData((prev) => {
        const updated = { ...prev, face: capturedImage };
        if (prev.document) {
          setCurrentStep(Step.REVIEW);
        } else {
          setCurrentStep(Step.SELECT_CAPTURE);
        }
        return updated;
      });
    } catch (err) {
      setError("Failed to capture selfie. Please try again.");
      console.error(err);
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    console.error("Capture error:", err);
  };

  const handleSubmit = () => {
    console.log("✅ VERIFICATION COMPLETE - All captured data:", {
      document: capturedData.document ? {
        filename: capturedData.document.filename,
        blob: capturedData.document.blob,
        blobSize: `${(capturedData.document.blob.size / 1024).toFixed(2)} KB`,
        base64: capturedData.document.base64,
        base64Length: capturedData.document.base64.length,
        dataUri: capturedData.document.dataUri.substring(0, 50) + '...',
        // Ready for Innovatrics API:
        innovatricsPayload: { image: { data: capturedData.document.base64 } }
      } : null,
      face: capturedData.face ? {
        filename: capturedData.face.filename,
        blob: capturedData.face.blob,
        blobSize: `${(capturedData.face.blob.size / 1024).toFixed(2)} KB`,
        base64: capturedData.face.base64,
        base64Length: capturedData.face.base64.length,
        dataUri: capturedData.face.dataUri.substring(0, 50) + '...',
        // Ready for Innovatrics API:
        innovatricsPayload: { image: { data: capturedData.face.base64 } }
      } : null
    });
    
    console.log("\n📦 How to use this data:");
    console.log("1. JPEG Files: Already downloaded to your device storage");
    console.log("2. For Innovatrics API: Use capturedData.document.base64 or capturedData.face.base64");
    console.log("3. For display: Use capturedData.document.dataUri or capturedData.face.dataUri");
    console.log("4. Raw blob: Use capturedData.document.blob or capturedData.face.blob");
    
    alert("✅ Verification complete!\n\n📸 Images saved to device storage\n📋 Check console for all data formats");
    handleRestart();
  };

  const handleRestart = () => {
    setCapturedData({});
    setError(null);
    setCurrentStep(Step.WELCOME);
  };

  return (
    <div className="app-container">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {currentStep === Step.WELCOME && (
        <div className="welcome-screen">
          <div className="card">
            <h1>KYC Verification</h1>
            <p>Complete your identity verification in 2 simple steps</p>

            <div className="steps-list">
              <div className="step-item">
                <h3>1. Capture ID Document</h3>
                <p>Take a clear photo of your government-issued ID</p>
              </div>
              <div className="step-item">
                <h3>2. Capture Selfie</h3>
                <p>Take a selfie for face verification</p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep(Step.SELECT_CAPTURE)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {currentStep === Step.SELECT_CAPTURE && (
        <div className="select-screen">
          <div className="card">
            <h2>Choose What to Capture</h2>
            <p>Select which verification step you'd like to complete</p>

            <div className="capture-options">
              <button
                className={`capture-option ${capturedData.document ? "captured" : ""}`}
                onClick={() => {
                  if (capturedData.document) {
                    setCapturedData((prev) => ({ ...prev, document: undefined }));
                  }
                  setCurrentStep(Step.DOCUMENT_CAPTURE);
                }}
              >
                <div>
                  <h3>ID Document</h3>
                  <p>
                    {capturedData.document
                      ? "Captured ✓ - Click to retake"
                      : "Capture your government-issued ID"}
                  </p>
                </div>
              </button>

              <button
                className={`capture-option ${capturedData.face ? "captured" : ""}`}
                onClick={() => {
                  if (capturedData.face) {
                    setCapturedData((prev) => ({ ...prev, face: undefined }));
                  }
                  setCurrentStep(Step.FACE_CAPTURE);
                }}
              >
                <div>
                  <h3>Selfie</h3>
                  <p>
                    {capturedData.face
                      ? "Captured ✓ - Click to retake"
                      : "Take a selfie for face verification"}
                  </p>
                </div>
              </button>
            </div>

            <div className="button-group">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(Step.WELCOME)}
              >
                Back
              </button>
              {capturedData.document && capturedData.face && (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentStep(Step.REVIEW)}
                >
                  Review & Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === Step.DOCUMENT_CAPTURE && (
        <DocumentAutoCapture
          onPhotoTaken={handleDocumentCapture}
          onError={handleError}
          onBack={() => setCurrentStep(Step.SELECT_CAPTURE)}
        />
      )}

      {currentStep === Step.FACE_CAPTURE && (
        <FaceAutoCapture
          onPhotoTaken={handleFaceCapture}
          onError={handleError}
          onBack={() => setCurrentStep(Step.SELECT_CAPTURE)}
        />
      )}

      {currentStep === Step.REVIEW && (
        <div className="review-screen">
          <div className="card">
            <h2>Review Your Captures</h2>

            <div className="review-grid">
              <div className="review-item">
                <h3>ID Document</h3>
                {capturedData.document && (
                  <img
                    src={capturedData.document.dataUrl}
                    alt="Captured document"
                  />
                )}
              </div>

              <div className="review-item">
                <h3>Selfie</h3>
                {capturedData.face && (
                  <img src={capturedData.face.dataUrl} alt="Captured face" />
                )}
              </div>
            </div>

            <div className="button-group">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(Step.SELECT_CAPTURE)}
              >
                Retake
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
