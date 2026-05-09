import FAQSection from '@/components/sections/faq-section';
import TestimonialsMarquee from '@/components/sections/testimonials-marquee';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

export default async function FAQPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  return (
    <div className="min-h-screen">
      <FAQSection />
      <TestimonialsMarquee />
    </div>
  );
}
