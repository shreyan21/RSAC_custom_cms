import HeroBackground from "./HeroBackground.jsx";
import HeroContent from "./HeroContent.jsx";
import HeroMetrics from "./HeroMetrics.jsx";
import ScrollIndicator from "./ScrollIndicator";

const Hero = () => {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="rsac-immersive-hero relative isolate min-h-[100svh] overflow-hidden border-b border-white/10 bg-[#040b16]"
      >

        <HeroBackground />

        <div className="hero-content-frame relative z-10 flex min-h-[100svh] items-start px-5 pb-20 pt-36 sm:px-8 sm:pb-24 sm:pt-40 md:px-12 md:pt-44 lg:items-center lg:px-20 lg:pb-28 lg:pt-36">

          <div className="w-full max-w-5xl">

            <div className="flex w-full justify-center lg:justify-start">

              <HeroContent />

            </div>

          </div>

        </div>
        <ScrollIndicator />

      </section>

      <HeroMetrics />
    </>
  );
};

export default Hero;
