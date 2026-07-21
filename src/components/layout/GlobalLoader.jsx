import { useIsContentLoading } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const GlobalLoader = () => {
  const loading = useIsContentLoading();
  const { t } = useLanguage();

  if (!loading) return null;
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {t("Loading content")}
    </span>
  );
};

export default GlobalLoader;
