import React from "react";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";

/**
 * Official Toss design-system provider, used only in the Apps-in-Toss runtime.
 * It is never rendered in the web-demo build because @toss/tds-mobile throws
 * "@toss/tds-mobile은 앱인토스 개발에만 사용할 수 있어요." on non-Toss hosts.
 */
export function TossProvider({ children }: { children: React.ReactNode }) {
  return (
    <TDSMobileAITProvider brandPrimaryColor="#527A41">
      {children}
    </TDSMobileAITProvider>
  );
}
