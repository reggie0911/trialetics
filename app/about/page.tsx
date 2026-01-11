import AboutHero from '@/components/sections/about-hero';
import BenefitsShowcase from '@/components/sections/benefits-showcase';
import TeamShowcase from '@/components/sections/team-showcase';
import VideoShowcase from '@/components/sections/video-showcase';
import WhyWeBegan from '@/components/sections/why-we-began';

export default function AboutPage() {
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
