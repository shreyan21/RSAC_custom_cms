import { useCallback, useRef, useState } from "react";

export default function useEditorValidation() {
  const invalid = useRef(new Set());
  const [count, setCount] = useState(0);
  const setFieldValidation = useCallback((field, hasError) => {
    if (hasError) invalid.current.add(field);
    else invalid.current.delete(field);
    setCount(invalid.current.size);
  }, []);
  const isInvalid = useCallback(() => invalid.current.size > 0, []);
  return { hasErrors: count > 0, isInvalid, setFieldValidation };
}
