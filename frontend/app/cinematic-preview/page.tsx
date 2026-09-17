import type { Metadata } from 'next';
import CinematicPreview from '../../components/cinematic-preview/CinematicPreview';

export const metadata: Metadata = {
  title: 'Cinematic preview | Nexus-Agent',
  description: 'A visual-only cinematic prototype for intelligent payment infrastructure.',
};

export default function CinematicPreviewPage() {
  return <CinematicPreview />;
}
