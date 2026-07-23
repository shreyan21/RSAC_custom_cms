import { useId } from "react";

export default function EditorTooltipButton({
  active = false,
  className = "",
  description,
  disabled = false,
  label,
  onClick,
  children,
}) {
  const tooltipId = useId();
  const accessibleLabel = description ? `${label}. ${description}` : label;

  return (
    <span className="editor-tool">
      <button
        type="button"
        className={`${active ? "active " : ""}${className}`.trim()}
        disabled={disabled}
        aria-label={accessibleLabel}
        aria-describedby={tooltipId}
        onClick={onClick}
      >
        {children}
      </button>
      <span className="editor-tool__tooltip" id={tooltipId} role="tooltip">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
    </span>
  );
}
