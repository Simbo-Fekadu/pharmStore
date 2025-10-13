import { useContext } from "react";
import ToastContext from "../contexts/ToastContext";

export default function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      remove: () => {},
    };
  }
  return ctx;
}
