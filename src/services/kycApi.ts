const DEFAULT_BASE_URL = 'https://id-verification-system-cf58.onrender.com';

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ID_VERIFICATION_BASE_URL
    ? import.meta.env.VITE_ID_VERIFICATION_BASE_URL
    : DEFAULT_BASE_URL;

export interface SubmitKycOptions {
  documentFront: File | Blob | null;
  documentBack?: File | Blob | null;
  selfies: Array<{ blob: Blob; filename?: string }>;
  primarySelfie?: { blob: Blob; filename?: string };
  personalDetails: {
    name: string;
    surname: string;
    dateOfBirth: string;
    documentType: string;
    userId: string;
    challengeType?: string;
  };
}

export interface SubmitKycResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export async function submitKyc(options: SubmitKycOptions): Promise<SubmitKycResponse> {
  const {
    documentFront,
    documentBack,
    selfies,
    primarySelfie,
    personalDetails: { name, surname, dateOfBirth, documentType, userId, challengeType = 'passive' },
  } = options;

  if (!documentFront) {
    throw new Error('Document front image is required.');
  }

  if (!primarySelfie && selfies.length === 0) {
    throw new Error('At least one selfie image is required.');
  }

  const formData = new FormData();

  formData.append('name', name);
  formData.append('surname', surname);
  formData.append('dateOfBirth', dateOfBirth);
  formData.append('documentType', documentType);
  formData.append('userId', userId);
  formData.append('challengeType', challengeType);

  const appendFile = (field: string, blob: Blob | File | null | undefined, filename: string) => {
    if (!blob) {
      return;
    }
    const file =
      blob instanceof File
        ? blob
        : new File([blob], filename, { type: (blob as Blob).type || 'image/jpeg' });
    formData.append(field, file, file.name);
  };

  appendFile('documentFront', documentFront, 'document_front.jpg');
  if (documentBack) {
    appendFile('documentBack', documentBack, 'document_back.jpg');
  }

  const primary = primarySelfie ?? (selfies.length > 0 ? selfies[0] : undefined);
  if (primary) {
    appendFile('selfiePrimary', primary.blob, primary.filename ?? 'selfie_primary.jpg');
  }

  selfies.forEach((selfie, index) => {
    appendFile('selfieImages', selfie.blob, selfie.filename ?? `selfie_${index + 1}.jpg`);
  });

  const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/api/kyc/verify`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `KYC submission failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody?.message || errorMessage;
    } catch (error) {
      // ignore JSON parse errors and keep generic message
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as SubmitKycResponse;
}
