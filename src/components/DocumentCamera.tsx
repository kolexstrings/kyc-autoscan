import "@innovatrics/dot-document-auto-capture";
import type {
  DocumentCameraProps,
  HTMLDocumentCaptureElement,
} from "@innovatrics/dot-document-auto-capture";
import { useEffect } from "react";

export default function DocumentCamera(props: DocumentCameraProps) {
  useEffect(() => {
    const documentAutoCaptureHTMLElement = document.getElementById(
      "x-dot-document-auto-capture",
    ) as HTMLDocumentCaptureElement | null;

    if (documentAutoCaptureHTMLElement) {
      documentAutoCaptureHTMLElement.cameraOptions = props;
    }
  });

  return <x-dot-document-auto-capture id="x-dot-document-auto-capture" />;
}
