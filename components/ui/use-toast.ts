"use client";

import toastLib from "react-hot-toast";

type ToastVariant = "default" | "destructive";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

export function useToast() {
  function toast({ title, description, variant }: ToastInput) {
    const message = description ? `${title}\n${description}` : title;
    if (variant === "destructive") {
      toastLib.error(message);
    } else {
      toastLib.success(message);
    }
  }

  return { toast };
}
