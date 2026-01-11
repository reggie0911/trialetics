import FAQSection from "@/components/sections/faq-section";
import FeaturesCarousel from "@/components/sections/features-carousel";
import FeaturesGrid from "@/components/sections/features-grid";
import FeaturesShowcase from "@/components/sections/features-showcase";
import Hero from "@/components/sections/hero";
import Logos from "@/components/sections/logos";
import Pricing from "@/components/sections/pricing";
import Testimonials from "@/components/sections/testimonials";

export default function Home() {
  return (
    <>
      <Hero />
      <Logos />
      <section id="features-carousel">
        <FeaturesCarousel />
      </section>
      <section id="features-grid">
        <FeaturesGrid />
      </section>
      <section id="features-showcase">
        <FeaturesShowcase />
      </section>
      <section id="testimonials">
        <Testimonials />
      </section>
      <section id="faq">
        <FAQSection />
      </section>
      <section id="pricing">
        <Pricing />
      </section>
    </>
  );
}
