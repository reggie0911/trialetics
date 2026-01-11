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
  {
    id: 'lumen-who-is-it-for',
    question: 'What is Lumen and who is it for?',
    answer:
      'Lumen is a task and workflow management platform designed for product teams, developers, and creatives who want to move faster with clarity and control.',
  },
  {
    id: 'technical-knowledge',
    question: 'Can I use Lumen without technical knowledge?',
    answer:
      'Absolutely! Lumen is designed with simplicity in mind. You can start organizing tasks, creating workflows, and collaborating with your team without any technical background. The intuitive interface makes it easy for anyone to get started.',
  },
  {
    id: 'integrations',
    question: 'Does Lumen integrate with tools like Slack or Figma?',
    answer:
      "Yes, Lumen integrates seamlessly with popular tools including Slack, Figma, GitHub, Jira, and many more. You can connect your existing workflow tools to create a unified workspace that fits your team's needs.",
  },
  {
    id: 'task-automation',
    question: 'How does task automation work in Lumen?',
    answer:
      'Lumen offers intelligent task automation that helps streamline repetitive processes. You can set up custom rules, triggers, and workflows that automatically assign tasks, update statuses, send notifications, and move projects through different stages based on your defined criteria.',
  },
  {
    id: 'security-compliance',
    question: 'Is Lumen secure and compliant?',
    answer:
      'Security is our top priority. Lumen is built with enterprise-grade security features including end-to-end encryption, SOC 2 Type II compliance, GDPR compliance, and regular security audits. Your data is protected with industry-standard security protocols.',
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
              <MessageSquare className="text-secondary size-18 stroke-1 md:size-20" />

              <h3 className="text-2xl">Still have questions?</h3>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground">
                Let&apos;s talk. Our team is here to help you make the most of
                Lumen. Whether it&apos;s onboarding, integration, or support.
              </p>
            </CardContent>
            <CardFooter className="mt-auto justify-self-end">
              <Button
                size="lg"
                variant="light"
                className="group h-12 w-full gap-4"
                asChild
              >
                <Link href="/contact">
                  Contact With Us
                  <div className="bg-border border-input grid size-5.5 place-items-center rounded-full border">
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
