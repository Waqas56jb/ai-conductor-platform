"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export function SigningReturn({ requestId, event }: { requestId: string; event: string }) {
  const t = useTranslations("quotes.sign");

  useEffect(() => {
    // Inside the signing modal: hand over to the page that opened it.
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "pratonna:esign", requestId, event },
        window.location.origin,
      );
    } else {
      window.location.replace("/app/quotes");
    }
  }, [requestId, event]);

  return <p style={{ padding: "2rem", textAlign: "center" }}>{t("returning")}</p>;
}
