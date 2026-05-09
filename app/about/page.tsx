import AboutHero from '@/components/sections/about-hero';
import BenefitsShowcase from '@/components/sections/benefits-showcase';
import TeamShowcase from '@/components/sections/team-showcase';
import VideoShowcase from '@/components/sections/video-showcase';
import WhyWeBegan from '@/components/sections/why-we-began';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

export default async function AboutPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  return (
    <>
      <AboutHero />
      <BenefitsShowcase />
      <VideoShowcase />
      <TeamShowcase />
      <WhyWeBegan />
    </>
  );
}
