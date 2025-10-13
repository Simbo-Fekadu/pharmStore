import { useContext } from "react";
import ConfirmContext from "../contexts/ConfirmContext";

export default function useConfirm() {
  const ctx = useContext(ConfirmContext);
  return ctx || (async () => true);
}
