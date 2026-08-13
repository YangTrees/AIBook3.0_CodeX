import { readFile, writeFile } from 'node:fs/promises';

const audioRoot = new URL('../public/assets/sounds/audio/', import.meta.url);
const overview = JSON.parse(await readFile(new URL('overview.json', audioRoot), 'utf8'));

const lessons = [];

for (const lesson of overview.lessons) {
  const units = JSON.parse(await readFile(new URL(`${lesson.lesson_id}/units.json`, audioRoot), 'utf8'));
  const explanations = units.filter((unit) => unit.kind === '讲解');
  const questions = units.filter((unit) => unit.kind === '题目+选项');
  const answers = units.filter((unit) => unit.kind === '答案+解析');

  if (questions.length !== 10 || answers.length !== 10) {
    throw new Error(`${lesson.lesson_id} 的题目或答案音频数量不是 10`);
  }

  const answerByIndex = new Map(answers.map((unit) => [unit.index, unit]));
  lessons.push({
    lesson_id: lesson.lesson_id,
    lesson_num: lesson.lesson_num,
    title: `《${lesson.lesson_name}》`,
    core_knowledge: lesson.core_knowledge,
    explanation_segments: explanations.map((unit) => ({
      audio: `${lesson.lesson_id}/${unit.mp3}`,
      source_text: unit.source_text,
      order: unit.index,
    })),
    quiz: questions.map((question) => {
      const answer = answerByIndex.get(question.index);
      if (!answer) throw new Error(`${question.unit_id} 缺少对应答案音频`);

      const options = [...question.source_text.matchAll(/^[A-D]\.\s*(.+)$/gm)].map((match) => match[1].trim());
      if (options.length !== 4) throw new Error(`${question.unit_id} 没有解析出 4 个选项`);

      return {
        question_no: question.index,
        question_audio: `${lesson.lesson_id}/${question.mp3}`,
        answer_audio: `${lesson.lesson_id}/${answer.mp3}`,
        title: question.title,
        options,
        correct_answer: question.answer,
        explanation: answer.explanation.replace(/\s*---\s*$/, ''),
      };
    }),
  });
}

const mapping = {
  generated_from: 'public/assets/sounds/audio/overview.json + Lxx/units.json',
  audio_base_path: 'assets/sounds/audio/',
  lessons,
};

await writeFile(
  new URL('../src/data/audio-mapping.json', import.meta.url),
  `${JSON.stringify(mapping, null, 2)}\n`,
  'utf8',
);

console.log(`audio-mapping.json 已生成：${lessons.length} 课`);
