import "@innovatrics/dot-face-auto-capture";
import type {
  FaceCameraProps,
  HTMLFaceCaptureElement,
} from "@innovatrics/dot-face-auto-capture";
import { useEffect } from "react";

export default function FaceCamera(props: FaceCameraProps) {
  useEffect(() => {
    const faceAutoCaptureHTMLElement = document.getElementById(
      "x-dot-face-auto-capture",
    ) as HTMLFaceCaptureElement | null;

    if (faceAutoCaptureHTMLElement) {
      faceAutoCaptureHTMLElement.cameraOptions = props;
    }
  });

  return <x-dot-face-auto-capture id="x-dot-face-auto-capture" />;
}
