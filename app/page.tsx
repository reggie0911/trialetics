import FAQSection from "@/components/sections/faq-section";
import FeaturesCarousel from "@/components/sections/features-carousel";
import FeaturesGrid from "@/components/sections/features-grid";
import FeaturesShowcase from "@/components/sections/features-showcase";
import Hero from "@/components/sections/hero";
import Logos from "@/components/sections/logos";
import Pricing from "@/components/sections/pricing";
import Testimonials from "@/components/sections/testimonials";
import { consumePageDynamic } from "@/lib/next/consume-page-dynamic";

type HomePageProps = {
  params?: Promise<Record<string, never>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home(props: HomePageProps) {
  await consumePageDynamic(props);
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
