"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "hsl(var(--card))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))"
        }
      }}
    />
  );
}
