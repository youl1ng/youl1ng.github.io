import type { Metadata } from 'next';
import ProjectsPage from '@/components/projects/ProjectsPage';
import { projectsPage } from '@/content/projects';

export const metadata: Metadata = {
  title: projectsPage.title,
};

export default function Page() {
  return <ProjectsPage />;
}
