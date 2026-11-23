import type { Metadata } from 'next';
import CaseStudy1Up from '@/components/case-study/CaseStudy1Up';
import { caseStudy } from '@/content/case-studies/1up';
import { site } from '@/content/home';

export const metadata: Metadata = {
  title: `${caseStudy.title} — ${site.name}`,
  description: caseStudy.tagline,
};

export default function Page() {
  return <CaseStudy1Up />;
}
