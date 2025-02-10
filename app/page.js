import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Trophy, Target, Sparkles, CheckCircle2 } from "lucide-react";
import HeroSection from "@/components/hero";
import FeatureSection from "@/components/FeatureSection";
import StatsSection from "@/components/StatsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialSection from "@/components/TestimonialSection";
import FAQSection from "@/components/FAQSection";
import CallToAction from "@/components/CallToAction";
import {Accordion, AccordionContent, AccordionItem,AccordionTrigger} from "@/components/ui/accordion";
import { features } from "@/data/features";
import { testimonial } from "@/data/testimonial";
import { faqs } from "@/data/faqs";
import { howItWorks } from "@/data/howItWorks";

export default function LandingPage() {
  return (
    <>
      <div className="grid-background"></div>

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeatureSection features={features} />

      {/* Stats Section */}
      <StatsSection />

      {/* How It Works Section */}
      <HowItWorksSection howItWorks={howItWorks} />

      {/* Testimonial Section */}
      <TestimonialSection testimonial={testimonial} />

      {/* FAQ Section */}
      <FAQSection faqs={faqs} />

      {/* CTA Section */}
      <CallToAction />
    </>
  );
}
