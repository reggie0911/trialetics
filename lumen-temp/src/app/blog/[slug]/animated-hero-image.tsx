'use client';

import { motion } from 'motion/react';
import Image from 'next/image';

interface AnimatedHeroImageProps {
  src: string;
  alt: string;
  slug: string;
}

export function AnimatedHeroImage({ src, alt, slug }: AnimatedHeroImageProps) {
  return (
    <motion.div
      layoutId={`cover-image-${slug}`}
      className="relative aspect-[16/9] overflow-hidden rounded-xl"
    >
      <Image src={src} alt={alt} fill className="object-cover" priority />
    </motion.div>
  );
}
