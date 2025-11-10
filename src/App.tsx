import { useState } from "react";
import type { DocumentCallback } from "@innovatrics/dot-document-auto-capture";
import type { FaceCallback } from "@innovatrics/dot-face-auto-capture";
import type { CapturedImageData, KycFormData, CapturedData } from "./types";
import { Step } from "./types";
import DocumentAutoCapture from "./components/DocumentAutoCapture";
import FaceAutoCapture from "./components/FaceAutoCapture";
import { blobToBase64, blobToDataUri, downloadImage, generateFilename } from "./utils/imageUtils";
import "./App.css";
import { submitKyc } from "./services/kycApi";

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.WELCOME);
  const [capturedData, setCapturedData] = useState<CapturedData>({ selfies: [] });
  const [formData, setFormData] = useState<KycFormData>({
    name: '',
    surname: '',
    dateOfBirth: '',
    documentType: 'passport',
  });
  const [userId] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `user_${crypto.randomUUID()}`;
    }
    return `user_${Math.random().toString(36).slice(2, 10)}`;
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.surname.trim() !== '' &&
    formData.dateOfBirth.trim() !== '' &&
    formData.documentType.trim() !== '';

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
        if (prev.selfies.length >= 4) {
          setCurrentStep(Step.REVIEW);
        } else {
          setCurrentStep(Step.FACE_CAPTURE);
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
        const newSelfies = [...prev.selfies, capturedImage].slice(-4); // Keep up to 4 selfies
        const updated = { ...prev, selfies: newSelfies };

        // If we have 4 selfies and a document, go to review
        if (newSelfies.length >= 4 && prev.document) {
          setCurrentStep(Step.REVIEW);
        }
        // Note: Don't change step here, let FaceAutoCapture handle the flow
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

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!capturedData.document || capturedData.selfies.length < 4) {
      setError('Please capture both your ID document and at least 4 selfies before submitting.');
      return;
    }

    if (!formData.name || !formData.surname || !formData.dateOfBirth || !formData.documentType) {
      setError('Please complete all required form fields.');
      return;
    }

    setError(null);
    setSubmissionMessage(null);
    setIsSubmitting(true);

    try {
      const response = await submitKyc({
        documentFront: capturedData.document.blob,
        selfies: capturedData.selfies.map((selfie) => ({
          blob: selfie.blob,
          filename: selfie.filename,
        })),
        personalDetails: {
          name: formData.name,
          surname: formData.surname,
          dateOfBirth: formData.dateOfBirth,
          documentType: formData.documentType,
          userId,
          challengeType: 'passive',
        },
      });

      setSubmissionMessage(response?.message || 'Verification submitted successfully.');
      handleRestart();
    } catch (err: any) {
      const fallbackMessage = err instanceof Error ? err.message : 'Failed to submit verification. Please try again.';
      setError(fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setCapturedData({ selfies: [] });
    setFormData({
      name: '',
      surname: '',
      dateOfBirth: '',
      documentType: 'passport',
    });
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

      {submissionMessage && (
        <div className="success-banner">
          {submissionMessage}
          <button onClick={() => setSubmissionMessage(null)}>Dismiss</button>
        </div>
      )}

      {currentStep === Step.WELCOME && (
        <div className="welcome-screen">
          <div className="card">
            <h1>KYC Verification</h1>
            <p>Complete your identity verification in a guided 4-step process</p>

            <div className="steps-list">
              <div className="step-item">
                <h3>1. Provide Personal Details</h3>
                <p>Fill in your information exactly as it appears on your ID document</p>
              </div>
              <div className="step-item">
                <h3>2. Capture ID Document</h3>
                <p>Take a clear photo of your government-issued ID</p>
              </div>
              <div className="step-item">
                <h3>3. Capture Selfies</h3>
                <p>Take multiple selfies with slight variations for face verification and liveness detection</p>
              </div>
              <div className="step-item">
                <h3>4. Review & Submit</h3>
                <p>Confirm your details and submit everything for verification</p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep(Step.FORM)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {currentStep === Step.FORM && (
        <div className="form-screen">
          <div className="card">
            <h2>Provide Your Details</h2>
            <p>Tell us who you are before we capture your document.</p>

            <div className="form-section">
              <div className="form-grid">
                <label className="form-field">
                  First Name
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter first name"
                    required
                  />
                </label>
                <label className="form-field">
                  Surname
                  <input
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleFormChange}
                    placeholder="Enter surname"
                    required
                  />
                </label>
                <label className="form-field">
                  Date of Birth
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label className="form-field">
                  Document Type
                  <select
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="passport">Passport</option>
                    <option value="driver_license">Driver's License</option>
                    <option value="id_card">ID Card</option>
                    <option value="residence_permit">Residence Permit</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="button-group">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(Step.WELCOME)}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                disabled={!isFormValid}
                onClick={() => setCurrentStep(Step.DOCUMENT_CAPTURE)}
              >
                Continue to Document Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === Step.DOCUMENT_CAPTURE && (
        <DocumentAutoCapture
          onPhotoTaken={handleDocumentCapture}
          onError={handleError}
          onBack={() => setCurrentStep(Step.FORM)}
        />
      )}

      {currentStep === Step.FACE_CAPTURE && (
        <FaceAutoCapture
          onPhotoTaken={handleFaceCapture}
          onError={handleError}
          onBack={() => setCurrentStep(Step.DOCUMENT_CAPTURE)}
          capturedSelfies={capturedData.selfies.map(s => s.dataUrl)}
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
                <h3>Selfie Captures</h3>
                {capturedData.selfies.length > 0 ? (
                  <div className="selfies-grid">
                    {capturedData.selfies.map((selfie, index) => (
                      <div key={index} className="selfie-thumbnail">
                        <img src={selfie.dataUrl} alt={`Selfie ${index + 1}`} />
                        <span className="selfie-number">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No selfies captured</p>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <h3>Verification Details</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(Step.FORM)}
                >
                  Edit Details
                </button>
              </div>
              <div className="form-info">
                <div className="info-item">
                  <strong>First Name:</strong> {formData.name}
                </div>
                <div className="info-item">
                  <strong>Surname:</strong> {formData.surname}
                </div>
                <div className="info-item">
                  <strong>Date of Birth:</strong> {formData.dateOfBirth}
                </div>
                <div className="info-item">
                  <strong>Document Type:</strong> {formData.documentType}
                </div>
                <div className="info-item">
                  <strong>User ID:</strong> {userId}
                </div>
                <div className="info-item">
                  <strong>Challenge Type:</strong> passive
                </div>
              </div>
            </div>

            <div className="button-group">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(Step.DOCUMENT_CAPTURE)}
              >
                Retake Document
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(Step.FACE_CAPTURE)}
              >
                Retake Selfies
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
