import audioMappingJson from './audio-mapping.json';

export interface LessonAudioMapping {
  lesson_id: string;
  lesson_num: number;
  title: string;
  core_knowledge: string[];
  explanation_segments: Array<{
    audio: string;
    source_text: string;
    order: number;
  }>;
  quiz: Array<{
    question_no: number;
    question_audio: string;
    answer_audio: string;
    title: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }>;
}

const lessons = audioMappingJson.lessons as LessonAudioMapping[];

export function getLessonAudioMapping(courseId: number) {
  return lessons.find((lesson) => lesson.lesson_num === courseId);
}

export function getAudioAssetUrl(relativePath: string) {
  return `${import.meta.env.BASE_URL}assets/sounds/audio/${relativePath}`;
}

export function getExplanationAudioForPages(courseId: number, pageCount: number) {
  const segments = getLessonAudioMapping(courseId)?.explanation_segments || [];
  if (pageCount <= 0 || segments.length === 0) return [];
  if (pageCount === 1) return [getAudioAssetUrl(segments[0].audio)];

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const segmentIndex = Math.round((pageIndex * (segments.length - 1)) / (pageCount - 1));
    return getAudioAssetUrl(segments[segmentIndex].audio);
  });
}
