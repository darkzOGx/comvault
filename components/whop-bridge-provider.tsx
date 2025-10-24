"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AppsSdk } from "@whop/iframe/dist/types";
import { createSdk } from "@whop/iframe";

type BridgeContextValue = {
  sdk: AppsSdk | null;
  ready: boolean;
  error?: string;
};

const BridgeContext = createContext<BridgeContextValue>({
  sdk: null,
  ready: false
});

export function WhopBridgeProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<BridgeContextValue>({ sdk: null, ready: false });

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (typeof window === "undefined") {
        return;
      }
      try {
        const sdk = createSdk({});
        if (!mounted) return;
        setValue({ sdk, ready: true });
      } catch (error) {
        console.error("[WhopBridge] failed to initialize", error);
        if (!mounted) return;
        setValue({
          sdk: null,
          ready: true,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

export function useWhopBridge() {
  return useContext(BridgeContext);
}
