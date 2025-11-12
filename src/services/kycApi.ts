const resolveApiBaseUrl = (): string => {
  const envBaseUrl =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ID_VERIFICATION_BASE_URL : undefined;

  if (!envBaseUrl) {
    throw new Error(
      'VITE_ID_VERIFICATION_BASE_URL is not defined. Please configure the environment variable to point to the ID verification backend.'
    );
  }

  return envBaseUrl.replace(/\/$/, '');
};

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

export class SubmitKycError extends Error {
  status?: number;
  details?: unknown;
  body?: unknown;

  constructor(
    message: string,
    options: { status?: number; details?: unknown; body?: unknown } = {}
  ) {
    super(message);
    this.name = 'SubmitKycError';
    this.status = options.status;
    this.details = options.details;
    this.body = options.body;
  }
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

  const endpoint = `${resolveApiBaseUrl()}/api/kyc/verify`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `KYC submission failed with status ${response.status}`;
    let errorBody: any = null;
    try {
      errorBody = await response.json();
      errorMessage = errorBody?.message || errorMessage;
    } catch (error) {
      // ignore JSON parse errors and keep generic message
    }
    throw new SubmitKycError(errorMessage, {
      status: response.status,
      details: errorBody?.details,
      body: errorBody,
    });
  }

  return (await response.json()) as SubmitKycResponse;
}
