import { useState } from "react";
import type { DocumentCallback } from "@innovatrics/dot-document-auto-capture";
import type { FaceCallback } from "@innovatrics/dot-face-auto-capture";
import type { CapturedImageData, KycFormData, CapturedData } from "./types";
import { Step } from "./types";
import DocumentAutoCapture from "./components/DocumentAutoCapture";
import FaceAutoCapture from "./components/FaceAutoCapture";
import {
  blobToBase64,
  blobToDataUri,
  generateFilename,
} from "./utils/imageUtils";
import "./App.css";
import { submitKyc, SubmitKycError } from "./services/kycApi";

type SubmissionResult = {
  status: "success" | "error";
  message: string;
  faceScore?: number;
  faceThreshold?: number;
  livenessStatus?: string;
  livenessConfidence?: number;
};

const DOCUMENTS_REQUIRING_BACK = new Set([
  "driver_license",
  "id_card",
  "residence_permit",
]);

const requiresBackCapture = (documentType: string) =>
  DOCUMENTS_REQUIRING_BACK.has(documentType);

const createInitialCapturedData = (): CapturedData => ({
  document: {},
  selfies: [],
});

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.WELCOME);
  const [capturedData, setCapturedData] = useState<CapturedData>(() =>
    createInitialCapturedData()
  );
  const [formData, setFormData] = useState<KycFormData>({
    name: "",
    surname: "",
    dateOfBirth: "",
    documentType: "passport",
  });
  const [userId] = useState<string>(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `user_${crypto.randomUUID()}`;
    }
    return `user_${Math.random().toString(36).slice(2, 10)}`;
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(
    null
  );
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);

  const FACE_MATCH_THRESHOLD = 0.64;

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.surname.trim() !== "" &&
    formData.dateOfBirth.trim() !== "" &&
    formData.documentType.trim() !== "";

  const proceedAfterDocumentCapture = (
    updatedData: CapturedData,
    side: "front" | "back"
  ) => {
    const needsBack = requiresBackCapture(formData.documentType);

    if (side === "front" && needsBack && !updatedData.document.back) {
      setCurrentStep(Step.DOCUMENT_BACK);
      return;
    }

    if (updatedData.selfies.length >= 4) {
      setCurrentStep(Step.REVIEW);
    } else {
      setCurrentStep(Step.FACE_CAPTURE);
    }
  };

  const handleDocumentCapture =
    (side: "front" | "back"): DocumentCallback =>
    async (imageData, _content) => {
      try {
        const blob = imageData.image;
        const filename = generateFilename(
          side === "front" ? "document-front" : "document-back"
        );

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

        console.log(`📄 Document ${side} captured:`, {
          filename,
          blobSize: `${(blob.size / 1024).toFixed(2)} KB`,
          base64Length: base64.length,
          format: blob.type,
          innovatricsFormat: { image: { data: base64 } },
        });

        setCapturedData((prev) => {
          const updated: CapturedData = {
            ...prev,
            document: {
              ...prev.document,
              [side]: capturedImage,
            },
          };

          proceedAfterDocumentCapture(updated, side);
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

      const filename = generateFilename("selfie");

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

      console.log("🤳 Selfie captured:", {
        filename,
        blobSize: `${(blob.size / 1024).toFixed(2)} KB`,
        base64Length: base64.length,
        format: blob.type,
        // For Innovatrics API, send: { image: { data: base64 } }
        innovatricsFormat: { image: { data: base64 } },
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

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "documentType") {
      setCapturedData((prev) => ({
        ...prev,
        document: {},
      }));
      if (currentStep !== Step.WELCOME && currentStep !== Step.FORM) {
        setCurrentStep(Step.DOCUMENT_CAPTURE);
      }
    }
  };

  const handleSubmit = async () => {
    const frontDocument = capturedData.document.front;
    const backDocument = capturedData.document.back;
    const needsBack = requiresBackCapture(formData.documentType);

    if (!frontDocument) {
      setError("Please capture the front of your document before submitting.");
      setCurrentStep(Step.DOCUMENT_CAPTURE);
      return;
    }

    if (needsBack && !backDocument) {
      setError("Please capture the back of your document before submitting.");
      setCurrentStep(Step.DOCUMENT_BACK);
      return;
    }

    if (capturedData.selfies.length < 4) {
      setError("Please capture at least 4 selfies before submitting.");
      setCurrentStep(Step.FACE_CAPTURE);
      return;
    }

    if (
      !formData.name ||
      !formData.surname ||
      !formData.dateOfBirth ||
      !formData.documentType
    ) {
      setError("Please complete all required form fields.");
      return;
    }

    setError(null);
    setSubmissionMessage(null);
    setIsSubmitting(true);
    setSubmissionResult(null);
    setCurrentStep(Step.SUBMITTING);

    try {
      const response = await submitKyc({
        documentFront: frontDocument?.blob ?? null,
        documentBack: backDocument?.blob,
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
          challengeType: "passive",
        },
      });

      setSubmissionMessage(
        response?.message || "Verification submitted successfully."
      );
      const results = response?.data?.results ?? {};
      const liveness = results?.livenessCheck ?? results?.liveness;
      const faceScore = results?.faceComparison?.score;

      setSubmissionResult({
        status: "success",
        message:
          response?.message ||
          "KYC verification completed successfully. We will email you with next steps shortly.",
        faceScore: typeof faceScore === "number" ? faceScore : undefined,
        faceThreshold: FACE_MATCH_THRESHOLD,
        livenessStatus: liveness?.status,
        livenessConfidence:
          typeof liveness?.confidence === "number"
            ? liveness.confidence
            : undefined,
      });
      setCurrentStep(Step.RESULT);
    } catch (err: any) {
      let fallbackMessage = "Failed to submit verification. Please try again.";
      let faceScore: number | undefined;
      let faceThreshold = FACE_MATCH_THRESHOLD;
      let livenessStatus: string | undefined;
      let livenessConfidence: number | undefined;

      if (err instanceof SubmitKycError) {
        fallbackMessage = err.message || fallbackMessage;
        const details = (err.details as any) ?? {};
        if (typeof details?.faceMatch?.score === "number") {
          faceScore = details.faceMatch.score;
        }
        if (typeof details?.faceMatch?.threshold === "number") {
          faceThreshold = details.faceMatch.threshold;
        }
        if (details?.liveness) {
          livenessStatus = details.liveness.status;
          if (typeof details.liveness.confidence === "number") {
            livenessConfidence = details.liveness.confidence;
          }
        }
      } else if (err instanceof Error) {
        fallbackMessage = err.message;
      }

      setError(null);
      setSubmissionResult({
        status: "error",
        message: fallbackMessage,
        faceScore,
        faceThreshold,
        livenessStatus,
        livenessConfidence,
      });
      setCurrentStep(Step.RESULT);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setCapturedData(createInitialCapturedData());
    setFormData({
      name: "",
      surname: "",
      dateOfBirth: "",
      documentType: "passport",
    });
    setError(null);
    setSubmissionMessage(null);
    setSubmissionResult(null);
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
            <p>
              Complete your identity verification in a guided 4-step process
            </p>

            <div className="steps-list">
              <div className="step-item">
                <h3>1. Provide Personal Details</h3>
                <p>
                  Fill in your information exactly as it appears on your ID
                  document
                </p>
              </div>
              <div className="step-item">
                <h3>2. Capture ID Document</h3>
                <p>Take a clear photo of your government-issued ID</p>
              </div>
              <div className="step-item">
                <h3>3. Capture Selfies</h3>
                <p>
                  Take multiple selfies with slight variations for face
                  verification and liveness detection
                </p>
              </div>
              <div className="step-item">
                <h3>4. Review & Submit</h3>
                <p>
                  Confirm your details and submit everything for verification
                </p>
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
          title="Capture the front of your document"
          description="Place the front side of your ID within the frame and hold steady."
          badgeText="Front captured"
          onPhotoTaken={handleDocumentCapture("front")}
          onError={handleError}
          onBack={() => setCurrentStep(Step.FORM)}
        />
      )}

      {currentStep === Step.DOCUMENT_BACK && (
        <DocumentAutoCapture
          title="Capture the back of your document"
          description="Flip your ID to the back side and align it inside the frame."
          badgeText="Back captured"
          onPhotoTaken={handleDocumentCapture("back")}
          onError={handleError}
          onBack={() => setCurrentStep(Step.DOCUMENT_CAPTURE)}
        />
      )}

      {currentStep === Step.FACE_CAPTURE && (
        <FaceAutoCapture
          onPhotoTaken={handleFaceCapture}
          onError={handleError}
          onBack={() => setCurrentStep(Step.DOCUMENT_CAPTURE)}
          capturedSelfies={capturedData.selfies.map((s) => s.dataUrl)}
        />
      )}

      {currentStep === Step.REVIEW && (
        <div className="review-screen">
          <div className="card">
            <h2>Review Your Captures</h2>

            <div className="review-grid">
              <div className="review-item">
                <h3>ID Document</h3>
                {capturedData.document.front || capturedData.document.back ? (
                  <div className="document-preview-grid">
                    {capturedData.document.front && (
                      <div className="document-preview">
                        <img
                          src={capturedData.document.front.dataUrl}
                          alt="Captured document front"
                        />
                        <span>Front</span>
                      </div>
                    )}
                    {capturedData.document.back && (
                      <div className="document-preview">
                        <img
                          src={capturedData.document.back.dataUrl}
                          alt="Captured document back"
                        />
                        <span>Back</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>No document captured</p>
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
                {isSubmitting ? "Submitting…" : "Submit Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === Step.SUBMITTING && (
        <div className="submitting-screen">
          <div className="card loading-card">
            <div className="loading-spinner" aria-hidden="true" />
            <h2>Processing your verification</h2>
            <p>
              Please hold on while we run document and liveness checks. This can
              take up to a minute.
            </p>
          </div>
        </div>
      )}

      {currentStep === Step.RESULT && submissionResult && (
        <div className="result-screen">
          <div
            className={`card result-card ${
              submissionResult.status === "success"
                ? "result-card-success"
                : "result-card-error"
            }`}
          >
            <div
              className={`result-icon ${
                submissionResult.status === "success"
                  ? "result-icon-success"
                  : "result-icon-error"
              }`}
              aria-hidden="true"
            />
            <div className="result-text">
              <h2>
                {submissionResult.status === "success"
                  ? "Verification Completed"
                  : "Verification Declined"}
              </h2>
              <p>{submissionResult.message}</p>
            </div>
            <div className="result-metrics">
              <div className="result-metric">
                <span className="metric-label">Face match score</span>
                <span className="metric-value">
                  {typeof submissionResult.faceScore === "number"
                    ? `${(submissionResult.faceScore * 100).toFixed(1)}%`
                    : "Not available"}
                </span>
                {submissionResult.faceThreshold && (
                  <span className="metric-note">
                    Threshold:{" "}
                    {(submissionResult.faceThreshold * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="result-metric">
                <span className="metric-label">Liveness result</span>
                <span className="metric-value">
                  {submissionResult.livenessStatus
                    ? submissionResult.livenessStatus.replace("_", " ")
                    : "Not available"}
                </span>
                {typeof submissionResult.livenessConfidence === "number" && (
                  <span className="metric-note">
                    Confidence:{" "}
                    {(submissionResult.livenessConfidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="result-actions">
              <button className="btn btn-primary" onClick={handleRestart}>
                Start a new verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
