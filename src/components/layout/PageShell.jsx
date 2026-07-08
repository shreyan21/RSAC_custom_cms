import Reveal from "../motion/Reveal";
import PageTrail from "../navigation/PageTrail";

const PageShell = ({
  eyebrow,
  title,
  intro,
  actions,
  breadcrumbs,
  children,
  density = "standard",
  className = "",
  largeEyebrow = false,
}) => {
  const isCompact = density === "compact";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`page-shell-enter page-shell-surface min-h-screen px-5 pb-12 sm:px-8 md:px-12 lg:px-20 ${
        isCompact
          ? "pt-28 sm:pt-32 lg:pt-32"
          : "pt-36 sm:pt-40 lg:pt-40"
      } ${className}`}
    >
      <section className="mx-auto max-w-7xl">
        <PageTrail items={breadcrumbs} />

        <Reveal
          className={`grid lg:grid-cols-[0.95fr_0.55fr] lg:items-end ${
            isCompact ? "gap-5" : "gap-8"
          }`}
        >
          <div>
            {eyebrow && (
              <p
                className={`rsac-kicker flex items-center text-[#c2410c] ${
                  largeEyebrow ? "gap-3 text-[0.9rem] tracking-[0.3em]" : "gap-2.5"
                }`}
              >
                <span
                  className="geo-tricolor-bar"
                  style={{ height: largeEyebrow ? "1.5rem" : "1.05rem" }}
                  aria-hidden="true"
                />
                {eyebrow}
              </p>
            )}

            {title && (
              <>
                <h1
                  className={`rsac-display max-w-5xl font-extrabold leading-tight tracking-[-0.022em] text-[#082032] ${
                    isCompact
                      ? "mt-3 text-[1.9rem] md:text-[2.5rem]"
                      : "mt-4 text-[2.4rem] md:text-[3.3rem]"
                  }`}
                >
                  {title}
                </h1>

                <span
                  aria-hidden="true"
                  className="mt-4 block h-[3px] w-24 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#fbbf24_30%,#0b6fa4_62%,#15803d_100%)]"
                />
              </>
            )}

            {intro && (
              <p
                className={`max-w-3xl text-base font-semibold text-slate-700 ${
                  isCompact
                    ? "mt-3 leading-relaxed"
                    : "mt-5 leading-[1.8] md:text-lg"
                }`}
              >
                {intro}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {actions}
            </div>
          )}
        </Reveal>

        <Reveal className={isCompact ? "mt-6" : "mt-8"} delay={0.08} amount={0.08} pop>
          {children}
        </Reveal>
      </section>
    </main>
  );
};

export default PageShell;
