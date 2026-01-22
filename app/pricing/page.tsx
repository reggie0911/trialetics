import { Metadata } from 'next';

import { Pricing32 } from '@/components/pricing32';
import Noise from '@/components/noise';

export const metadata: Metadata = {
  title: 'Pricing | Trialetics',
  description: 'Flexible pricing options for clinical trial management software. Choose from App Store modules, custom development, or enterprise solutions.',
};

export default function PricingPage() {
  return (
    <>
      <section className="relative">
        <Noise />
        <Pricing32 />
      </section>
    </>
  );
}
