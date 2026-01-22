'use client';

import { ChevronRightIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import Noise from '@/components/noise';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';

const faqData = [
  // General FAQs
  {
    id: 'services',
    question: 'What services does Trialetics provide?',
    answer:
      'Trialetics specializes in custom software solutions for clinical trial management. Our services include tailored development for specific trial needs, conversion of Excel spreadsheets into scalable SaaS platforms, data security enhancement, and provision of immediate solutions via our app store.',
  },
  {
    id: 'excel-to-saas',
    question: 'How does the Excel to SaaS conversion process work?',
    answer:
      'Our conversion process involves analyzing your existing Excel data model, planning the migration strategy, developing a custom SaaS solution that meets your specific requirements, and finally ensuring seamless data transfer while maintaining integrity and compliance.',
  },
  {
    id: 'project-timeline',
    question: 'How long does a custom software project take to complete?',
    answer:
      'On average, custom software projects are completed within an 8-week timeframe. However, the duration can vary based on the complexity and specific requirements of the project. Our team works diligently to meet project timelines while ensuring the highest quality.',
  },
  {
    id: 'ready-solutions',
    question: 'Are there ready-to-use solutions available for immediate needs?',
    answer:
      'Yes, Trialetics offers a range of ready-to-deploy solutions available through our app store. These solutions are designed for clinical trials and offer quick support for various management needs, ensuring that you can move forward without delay.',
  },
  {
    id: 'data-security',
    question: 'How does Trialetics ensure data security and compliance?',
    answer:
      'We adhere to stringent data security standards and ensure compliance with relevant regulations, including HIPAA. Our solutions feature robust encryption, secure data storage, and controlled access mechanisms to protect sensitive trial data.',
  },
  {
    id: 'integration',
    question: 'Can Trialetics integrate with existing systems?',
    answer:
      'Yes, our custom solutions are designed with flexibility in mind and can integrate seamlessly with your existing clinical trial systems and databases. Our goal is to enhance your operations without disrupting your current workflows.',
  },
  {
    id: 'support',
    question: 'What support does Trialetics offer post-deployment?',
    answer:
      'We provide comprehensive support and training post-deployment, including troubleshooting, system updates, and user training. Our team is committed to ensuring your team is comfortable and proficient in using our solutions.',
  },
  {
    id: 'industries',
    question: 'What industries does Trialetics serve?',
    answer:
      'While our primary focus is on clinical trial management within the healthcare and life sciences industries, our software solutions are versatile and can be tailored to meet the needs of related sectors requiring data management, analytics, and operational efficiency.',
  },
  {
    id: 'innovation',
    question: 'How does Trialetics stay ahead of technological advancements?',
    answer:
      'Our team continually monitors and adopts the latest technologies and best practices in software development and clinical trial management. We invest in ongoing research and development to ensure our solutions are innovative and effective.',
  },
  {
    id: 'start-project',
    question: 'How can I start a project with Trialetics?',
    answer:
      'Starting a project with us is simple. Just reach out to us through our website\'s contact form or directly via email or phone. Our team will schedule a consultation to understand your needs, discuss potential solutions, and outline the next steps.',
  },
  // Security & Compliance FAQs
  {
    id: 'hipaa-compliance',
    question: 'Is Trialetics compliant with HIPAA?',
    answer:
      'Yes, our solutions are fully compliant with the Health Insurance Portability and Accountability Act (HIPAA), ensuring the confidentiality, integrity, and security of healthcare information.',
  },
  {
    id: 'international-compliance',
    question: 'How do you handle compliance with international data protection regulations?',
    answer:
      'We ensure compliance with international regulations such as the General Data Protection Regulation (GDPR) through data minimization, obtaining proper consent, and upholding individuals\' rights over their data, among other requirements.',
  },
];

export default function FAQSection() {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="container">
        {/* Section Header */}
        <h2 className="text-4xl leading-tight tracking-tight lg:text-5xl">
          Frequently <br className="hidden md:block" />
          asked questions:
        </h2>

        {/* FAQ Content */}
        <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-3">
          {/* FAQ Accordion - Left Side */}
          <div className="lg:col-span-2">
            <Accordion type="single" collapsible className="space-y-4">
              {faqData.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border-input hover:shadow-primary/5 rounded-lg !border px-6 py-2 transition-all duration-300 hover:shadow-md"
                >
                  <AccordionTrigger className="cursor-pointer text-base font-medium hover:no-underline md:text-lg lg:text-xl">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Card className="hover:shadow-primary/5 h-full gap-6 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="gap-6 md:gap-8 lg:gap-11">
              <MessageSquare className="text-muted-foreground size-18 stroke-1 md:size-20" />

              <h3 className="text-2xl">Still have questions?</h3>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground">
                Let&apos;s talk. Our team is here to help you make the most of
                Trialetics. Whether it&apos;s onboarding, integration, or support.
              </p>
            </CardContent>
            <CardFooter className="mt-auto justify-self-end">
              <Button
                size="lg"
                variant="outline"
                className="group h-12 w-full gap-4"
                asChild
              >
                <Link href="https://www.linkedin.com/company/trialetics-io" target="_blank" rel="noopener noreferrer">
                  Contact With Us
                  <div className="bg-secondary dark:bg-accent border-input grid size-5.5 place-items-center rounded-full border">
                    <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.25" />
                  </div>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
