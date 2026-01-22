"use client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  FolderOpen,
  GanttChart,
  HardDrive,
  Headphones,
  Heart,
  Layers,
  LayoutGrid,
  LineChart,
  LucideIcon,
  MessageSquare,
  Minus,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserPlus,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Fragment, useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

interface FeatureItem {
  icon: LucideIcon;
  text: string;
}

interface PricingPlan {
  name: string;
  price: string;
  billingNote: string;
  description: string;
  features: FeatureItem[];
  mostPopular?: boolean;
  isAddOn?: boolean;
  cta: {
    text: string;
    href: string;
  };
}

const PLANS: PricingPlan[] = [
  {
    name: "Indie",
    price: "$99",
    billingNote: "per user / Billed monthly",
    description: "Perfect for independent CRAs, site monitors, and consultants running single studies.",
    features: [
      { icon: User, text: "Single User License" },
      { icon: Layers, text: "1 Active Study" },
      { icon: ClipboardList, text: "Study Startup Tracker" },
      { icon: Building2, text: "Site Activation & Feasibility" },
      { icon: Activity, text: "Monitoring Visit Tracker" },
      { icon: ShieldCheck, text: "Protocol Deviation Tracker" },
      { icon: UserPlus, text: "Patient Enrollment Tracker" },
      { icon: Brain, text: "AI Assistant (basic drafting)" },
      { icon: Bell, text: "Alerts & Notifications" },
      { icon: Headphones, text: "Email Support" },
    ],
    cta: {
      text: "Get Started",
      href: "https://www.linkedin.com/company/trialetics-io",
    },
  },
  {
    name: "Growth",
    mostPopular: true,
    price: "$399",
    billingNote: "per user / Billed monthly",
    description: "Designed for sponsors, CROs, startup companies, and growing study teams managing multiple trials.",
    features: [
      { icon: Sparkles, text: "Everything in Indie, plus:" },
      { icon: Layers, text: "3 Active Studies" },
      { icon: LayoutGrid, text: "CTMS & eTMF Core System" },
      { icon: FolderOpen, text: "Document Management & Version Control" },
      { icon: ClipboardList, text: "Query Management Tracker" },
      { icon: Heart, text: "Safety Event / AE Tracker" },
      { icon: DollarSign, text: "Budget & Invoice Tracker" },
      { icon: FileText, text: "TMF/eTMF Document Tracker" },
      { icon: CreditCard, text: "Site Contracts & Payments" },
      { icon: Calendar, text: "Calendar & Site Visit Scheduling" },
      { icon: Upload, text: "Data Imports (CSV/Excel)" },
      { icon: BarChart3, text: "Dashboards & Analytics" },
      { icon: Users, text: "Role-Based Permissions" },
      { icon: HardDrive, text: "Secure Cloud Storage (50GB)" },
      { icon: Brain, text: "AI Assistant (full drafting)" },
      { icon: LineChart, text: "AI-Powered Analytics & Insights" },
      { icon: MessageSquare, text: "Natural Language Data Queries" },
      { icon: MessageSquare, text: "Email + Chat Support" },
    ],
    cta: {
      text: "Get Started",
      href: "https://www.linkedin.com/company/trialetics-io",
    },
  },
  {
    name: "Scale",
    price: "$1,299",
    billingNote: "Billed monthly",
    description: "Enterprise-grade for Pharma/Biotech companies with unlimited users and studies.",
    features: [
      { icon: Sparkles, text: "Everything in Growth, plus:" },
      { icon: Layers, text: "Unlimited Active Studies" },
      { icon: Users, text: "Unlimited Users (no per-seat charges)" },
      { icon: Building2, text: "Multi-Department Management" },
      { icon: BarChart3, text: "Advanced Analytics & Reporting" },
      { icon: Layers, text: "Cross-Study Portfolio Views" },
      { icon: ShieldCheck, text: "Department-Level Permissions" },
      { icon: ShieldCheck, text: "Audit Trail & Compliance Portal" },
      { icon: HardDrive, text: "Secure Cloud Storage (100GB)" },
      { icon: AlertTriangle, text: "AI Risk Detection & Predictions" },
      { icon: Workflow, text: "AI-Driven Workflow Automation" },
      { icon: Headphones, text: "Priority Support" },
    ],
    cta: {
      text: "Get Started",
      href: "https://www.linkedin.com/company/trialetics-io",
    },
  },
  {
    name: "Custom Build",
    price: "Contact Us",
    billingNote: "Flat Fee",
    isAddOn: true,
    description: "Transform legacy trackers into automation. Perfect for teams ready to future-proof operations.",
    features: [
      { icon: Sparkles, text: "Bundled with any monthly plan" },
      { icon: RefreshCw, text: "Excel-to-SaaS Conversion (custom trackers)" },
      { icon: LayoutGrid, text: "Integrated into CTMS & eTMF workflows" },
      { icon: Workflow, text: "Custom Workflow Automation" },
      { icon: Rocket, text: "API Access & 3rd-Party Integrations" },
      { icon: Users, text: "Dedicated Onboarding & Validation" },
      { icon: Headphones, text: "Premium Support (priority)" },
      { icon: Zap, text: "Future-Proof Guarantee" },
    ],
    cta: {
      text: "Contact Us",
      href: "https://www.linkedin.com/company/trialetics-io",
    },
  },
];

// Feature comparison data
interface FeatureComparison {
  category: string;
  features: {
    name: string;
    indie: boolean | string;
    growth: boolean | string;
    scale: boolean | string;
    enterprise: boolean | string;
  }[];
}

const FEATURE_COMPARISONS: FeatureComparison[] = [
  {
    category: "Study Management",
    features: [
      { name: "Active Study Limit", indie: "1 Study", growth: "3 Studies", scale: "Unlimited", enterprise: "Add-on" },
      { name: "Study Startup Tracker", indie: true, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Site Activation & Feasibility", indie: true, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Patient Enrollment Tracker", indie: true, growth: true, scale: true, enterprise: "Add-on" },
    ],
  },
  {
    category: "Monitoring & Compliance",
    features: [
      { name: "Monitoring Visit Tracker", indie: true, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Protocol Deviation Tracker", indie: true, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Query Management Tracker", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Safety Event / AE Tracker", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Audit Trail & Compliance Portal", indie: false, growth: false, scale: true, enterprise: "Add-on" },
    ],
  },
  {
    category: "Document & Data",
    features: [
      { name: "CTMS & eTMF Core System Access", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Document Management & Version Control", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "TMF/eTMF Document Tracker", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Data Imports (CSV/Excel)", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Secure Cloud Storage", indie: false, growth: "50GB", scale: "100GB", enterprise: "Add-on" },
    ],
  },
  {
    category: "Finance & Scheduling",
    features: [
      { name: "Budget & Invoice Tracker", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Site Contracts & Payments", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Calendar & Site Visit Scheduling", indie: false, growth: true, scale: true, enterprise: "Add-on" },
    ],
  },
  {
    category: "AI Features",
    features: [
      { name: "AI Assistant (Document Drafting)", indie: "Basic", growth: "Full", scale: "Full", enterprise: "Add-on" },
      { name: "AI-Powered Analytics & Insights", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Natural Language Data Queries", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "AI Risk Detection & Predictions", indie: false, growth: false, scale: true, enterprise: "Add-on" },
      { name: "AI-Driven Workflow Automation", indie: false, growth: false, scale: true, enterprise: "Add-on" },
    ],
  },
  {
    category: "Team & Access",
    features: [
      { name: "User License", indie: "1 User", growth: "Per User", scale: "Unlimited", enterprise: "Add-on" },
      { name: "Role-Based Permissions", indie: false, growth: true, scale: true, enterprise: "Add-on" },
      { name: "Multi-Department Management", indie: false, growth: false, scale: true, enterprise: "Add-on" },
      { name: "Department-Level Permissions", indie: false, growth: false, scale: true, enterprise: "Add-on" },
    ],
  },
  {
    category: "Support & Onboarding",
    features: [
      { name: "Email Support", indie: true, growth: true, scale: true, enterprise: true },
      { name: "Chat Support", indie: false, growth: true, scale: true, enterprise: true },
      { name: "Priority Support", indie: false, growth: false, scale: true, enterprise: true },
      { name: "Dedicated Onboarding", indie: false, growth: false, scale: false, enterprise: true },
      { name: "Premium Support", indie: false, growth: false, scale: false, enterprise: true },
    ],
  },
  {
    category: "Integrations & Automation",
    features: [
      { name: "Excel-to-SaaS Conversion", indie: false, growth: false, scale: false, enterprise: true },
      { name: "Custom Workflow Automation", indie: false, growth: false, scale: false, enterprise: true },
      { name: "API Access", indie: false, growth: false, scale: false, enterprise: true },
      { name: "Future-Proof Guarantee", indie: false, growth: false, scale: false, enterprise: true },
    ],
  },
];

interface Pricing32Props {
  className?: string;
}

const Pricing32 = ({ className }: Pricing32Props) => {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="flex flex-col items-center justify-center gap-9.5">
          <h1 className="text-center text-4xl font-medium tracking-tighter text-foreground md:text-5xl lg:text-6xl">
            AI-Powered Clinical Trial Management
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-center text-lg leading-relaxed">
            Choose the plan that fits your needs. From independent monitors to enterprise pharma companies.
          </p>
          <div className="mt-6 grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, index) => (
              <PlanCard
                key={index}
                plan={plan}
              />
            ))}
          </div>
        </div>
        
        {/* Compare Plans Button */}
        <div className="mt-12 flex items-center justify-center">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2"
          >
            Compare all plans
            <ChevronDown className={cn("size-4 transition-transform duration-300", showComparison && "rotate-180")} />
          </Button>
        </div>

        {/* Feature Comparison Table */}
        <div className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          showComparison ? "mt-12 max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="rounded-lg border bg-background overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-semibold">Features</th>
                  <th className="p-4 text-center font-semibold">Indie</th>
                  <th className="p-4 text-center font-semibold bg-primary/5 border-x border-primary/20">
                    <span className="text-primary">Growth</span>
                  </th>
                  <th className="p-4 text-center font-semibold">Scale</th>
                  <th className="p-4 text-center font-semibold">Custom Build</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISONS.map((category, catIndex) => (
                  <Fragment key={`category-${catIndex}`}>
                    <tr className="border-b bg-muted/30">
                      <td colSpan={5} className="p-3 font-semibold text-foreground">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, featIndex) => (
                      <tr key={`feat-${catIndex}-${featIndex}`} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-4 text-sm text-muted-foreground">{feature.name}</td>
                        <td className="p-4 text-center">
                          <FeatureValue value={feature.indie} />
                        </td>
                        <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                          <FeatureValue value={feature.growth} highlight />
                        </td>
                        <td className="p-4 text-center">
                          <FeatureValue value={feature.scale} />
                        </td>
                        <td className="p-4 text-center">
                          <FeatureValue value={feature.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 flex items-center justify-center">
          <Button size="lg" variant="outline" asChild>
            <a href="https://www.linkedin.com/company/trialetics-io" target="_blank" rel="noopener noreferrer">
              Have questions? Connect with us
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

// Feature value display component
const FeatureValue = ({ value, highlight }: { value: boolean | string; highlight?: boolean }) => {
  if (typeof value === "string") {
    return <span className={cn("text-sm font-medium", highlight && "text-primary")}>{value}</span>;
  }
  if (value === true) {
    return <Check className={cn("mx-auto size-5", highlight ? "text-primary" : "text-green-600")} />;
  }
  return <Minus className="mx-auto size-5 text-muted-foreground/40" />;
};

const PlanCard = ({
  plan,
}: {
  plan: PricingPlan;
}) => {
  return (
    <div
      className={cn(
        "relative h-full w-full rounded-lg border px-6 py-5 bg-background",
        plan?.mostPopular && "border-primary",
        plan?.isAddOn && "border-dashed"
      )}
    >
      {plan.isAddOn && (
        <div className="absolute top-0 left-1/2 w-fit -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted px-4 py-1 text-xs font-medium text-muted-foreground border">
          Add-on
        </div>
      )}
      <div className="text-2xl font-semibold">{plan.name}</div>
      <div className="mt-2">
        <span className="text-[34px] font-bold">{plan.price}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {plan.billingNote}
      </div>
      <div className="mt-4 mb-6 text-sm text-muted-foreground leading-relaxed">
        {plan.description}
      </div>
      <Button className="w-full" variant={plan.mostPopular ? "default" : "outline"} size="lg" asChild>
        <a href={plan.cta.href} target={plan.cta.href.startsWith("http") ? "_blank" : undefined} rel={plan.cta.href.startsWith("http") ? "noopener noreferrer" : undefined}>
          {plan.cta.text}
          <ArrowRight />
        </a>
      </Button>
      <div className="mt-6 flex flex-col gap-3">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3 text-sm text-foreground">
            <feature.icon className="size-4 shrink-0 mt-0.5 stroke-[1.5]" />
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
      {plan.mostPopular && (
        <div className="absolute top-0 left-1/2 w-fit -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
          Most popular
        </div>
      )}
    </div>
  );
};

export { Pricing32 };
