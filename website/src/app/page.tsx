import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Features } from "@/components/home/features";
import { OutputOptions } from "@/components/home/output-options";
import { Origin } from "@/components/home/origin";
import { Faq } from "@/components/home/faq";
import { FinalCta } from "@/components/home/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <OutputOptions />
      <Origin />
      <Faq />
      <FinalCta />
    </>
  );
}
