import { notFound } from 'next/navigation';
import { getAllStoryIds, getStoryWithWords } from '@/lib/queries';
import ReadingView from '@/components/ReadingView';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const ids = await getAllStoryIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const story = await getStoryWithWords(id);
    return {
      title: `${story.title_en} | Farsi Reader`,
      description: story.description,
    };
  } catch {
    return { title: 'Story | Farsi Reader' };
  }
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let story;
  try {
    story = await getStoryWithWords(id);
  } catch {
    notFound();
  }
  return <ReadingView story={story} />;
}
