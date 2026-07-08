import { useContext } from "react";
import { DialogContext } from "../contexts/DialogContextCore";

export const useDialog = () => useContext(DialogContext);
