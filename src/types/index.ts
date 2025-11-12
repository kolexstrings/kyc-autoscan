export const Step = {
  WELCOME: "WELCOME",
  FORM: "FORM",
  DOCUMENT_CAPTURE: "DOCUMENT_CAPTURE",
  FACE_CAPTURE: "FACE_CAPTURE",
  REVIEW: "REVIEW",
  SUBMITTING: "SUBMITTING",
  RESULT: "RESULT",
} as const;

export type Step = typeof Step[keyof typeof Step];

export interface CapturedImageData {
  blob: Blob;              // Original blob from SDK
  dataUrl: string;         // Object URL for preview (blob:http://...)
  base64: string;          // Pure base64 for Innovatrics API
  dataUri: string;         // Full data URI (data:image/jpeg;base64,...)
  filename: string;        // Downloaded filename
}

export interface KycFormData {
  name: string;
  surname: string;
  dateOfBirth: string;
  documentType: string;
}

export interface KycSubmissionPayload {
  identificationDocumentImage: string[];
  image: string;
  selfieImages: string[];
  name: string;
  surname: string;
  dateOfBirth: string;
  userId: string;
  documentType: string;
  challengeType: 'passive';
}

export interface CapturedData {
  document?: CapturedImageData;
  selfies: CapturedImageData[];  // Array of up to 4 selfies
}
