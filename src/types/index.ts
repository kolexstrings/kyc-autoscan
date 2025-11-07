export const Step = {
  WELCOME: "WELCOME",
  SELECT_CAPTURE: "SELECT_CAPTURE",
  DOCUMENT_CAPTURE: "DOCUMENT_CAPTURE",
  FACE_CAPTURE: "FACE_CAPTURE",
  REVIEW: "REVIEW",
} as const;

export type Step = typeof Step[keyof typeof Step];

export interface CapturedImage {
  imageUrl: string;
  data?: string;
}
