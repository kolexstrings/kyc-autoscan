import "@innovatrics/dot-auto-capture-ui/face";
import type {
  FaceUiProps,
  HTMLFacetUiElement,
} from "@innovatrics/dot-auto-capture-ui/face";
import { useEffect } from "react";

export default function FaceUi(props: FaceUiProps) {
  useEffect(() => {
    const uiElement = document.getElementById(
      "x-dot-face-auto-capture-ui",
    ) as HTMLFacetUiElement | null;

    if (uiElement) {
      uiElement.props = props;
    }
  });

  return <x-dot-face-auto-capture-ui id="x-dot-face-auto-capture-ui" />;
}
