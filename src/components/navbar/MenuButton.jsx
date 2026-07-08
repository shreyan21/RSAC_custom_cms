import { useSiteSettings } from "../../hooks/useData";

const MenuButton = ({ isOpen, setIsOpen }) => {
  const { ui } = useSiteSettings();
  const tone = isOpen ? "text-white" : "text-[#12324a]";
  const lineTone = isOpen ? "bg-white" : "bg-[#12324a]";
  const surface = isOpen
    ? "border-white/15 bg-white/10 shadow-none"
    : "border-emerald-900/10 bg-white/72 shadow-[0_10px_28px_rgba(18,50,74,0.12)]";

  return (
    <button
      id="main-menu-toggle"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={
        isOpen ? ui?.closeMenu || "Close menu" : ui?.openMenu || "Open menu"
      }
      aria-controls="main-menu-dialog"
      aria-expanded={isOpen}
      className={`relative z-[120] flex h-10 w-10 items-center justify-center rounded-lg border uppercase tracking-[0.2em] transition duration-200 ${surface} ${tone}`}
    >
      <div className="flex flex-col gap-1">
        <span
          className={`block h-[2px] w-6 transition-transform duration-300 ${lineTone} ${
            isOpen ? "translate-y-[6px] rotate-45" : ""
          }`}
        />

        <span
          className={`block h-[2px] w-6 transition-opacity duration-300 ${lineTone} ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        />

        <span
          className={`block h-[2px] w-6 transition-transform duration-300 ${lineTone} ${
            isOpen ? "-translate-y-[6px] -rotate-45" : ""
          }`}
        />
      </div>
    </button>
  );
};

export default MenuButton;
