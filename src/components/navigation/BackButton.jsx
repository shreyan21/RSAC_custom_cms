import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";

// Label is always just "Back" (वापस in Hindi) regardless of the passed `label`/
// route state — only the navigation target keeps using backTo/fallback.
const BackButton = ({ fallback = "/", label, className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const backTo = location.state?.backTo;
  const targetPath = backTo?.path || fallback;
  const displayLabel = label || t("Back");

  const handleClick = () => {
    const historyIndex = Number(window.history.state?.idx);

    if (Number.isFinite(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate(targetPath);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#102f46] transition hover:border-[#0b6fa4]/35 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {displayLabel}
    </button>
  );
};

export default BackButton;
