import { useIsContentLoading } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const GlobalLoader = () => {
  const loading = useIsContentLoading();
  const { isHindi } = useLanguage();

  if (!loading) return null;
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {isHindi ? "सामग्री लोड हो रही है" : "Loading content"}
    </span>
  );
};

export default GlobalLoader;
