import type { Metadata } from 'next';
import CaseStudyDatPone from '@/components/case-study/CaseStudyDatPone';
import { datpone } from '@/content/case-studies/datpone';
import { site } from '@/content/home';

export const metadata: Metadata = {
  title: `${datpone.title} — ${site.name}`,
  description: datpone.tagline,
};

export default function Page() {
  return <CaseStudyDatPone />;
}
