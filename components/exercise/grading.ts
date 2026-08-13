import type { Question } from '@/lib/api/curriculum-types';
import type {
  DictationAnswer,
  GapFillingAnswer,
  ListenAndChooseAnswer,
  MatchingAnswer,
  MultipleChoiceAnswer,
  QuestionAnswerValue,
  QuestionResult,
  SentenceBuildAnswer,
  SentenceSurgeryAnswer,
  ShortAnswerAnswer,
  TranslationAnswer,
} from '@/components/exercise/answer-types';

// Straight quote, iOS/Android smart quotes (' '), backtick, acute accent, and
// the Unicode "modifier letter apostrophe" — every apostrophe glyph a mobile
// keyboard's autocorrect might substitute in, all stripped the same as a
// missing apostrophe so "dont"/"don't"/"don't" all grade as equal.
const PUNCTUATION_PATTERN = /[.,!?;:"'‘’‛ʼ´`]/g;

function normalize(text: string, caseSensitive = false): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  const cased = caseSensitive ? trimmed : trimmed.toLowerCase();
  return cased.replace(PUNCTUATION_PATTERN, '');
}

/** `correct_answer` fields may pack alternatives separated by `/`. */
function answerMatches(userText: string, correctAnswer: string, caseSensitive = false): boolean {
  const alternatives = correctAnswer.split('/').map((s) => s.trim());
  const normalizedUser = normalize(userText, caseSensitive);
  return alternatives.some((alt) => normalize(alt, caseSensitive) === normalizedUser);
}

/** The blank/empty answer to seed local state with when a question first mounts. */
export function emptyAnswerFor(question: Question): QuestionAnswerValue {
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return { selectedChoiceId: null } satisfies MultipleChoiceAnswer;
    case 'short_answer':
      return { text: '' } satisfies ShortAnswerAnswer;
    case 'fill_in_the_blank':
      return { values: {} } satisfies GapFillingAnswer;
    case 'matching':
      return { matches: {} } satisfies MatchingAnswer;
    case 'sentence_build':
      return { sentences: (question.sentence_build ?? []).map(() => '') } satisfies SentenceBuildAnswer;
    case 'translation':
      return { text: '' } satisfies TranslationAnswer;
    case 'dictation':
      return { text: '' } satisfies DictationAnswer;
    case 'listen_and_choose':
      return { selectedIndex: null } satisfies ListenAndChooseAnswer;
    case 'sentence_surgery':
      return { foundIndex: null, selectedOptionIndex: null } satisfies SentenceSurgeryAnswer;
  }
}

/** Whether enough has been filled in to enable the "Check Answer" button. */
export function isAnswerComplete(question: Question, answer: QuestionAnswerValue): boolean {
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return (answer as MultipleChoiceAnswer).selectedChoiceId != null;
    case 'short_answer':
      return (answer as ShortAnswerAnswer).text.trim().length > 0;
    case 'fill_in_the_blank': {
      const gaps = question.gap_filling ?? [];
      const { values } = answer as GapFillingAnswer;
      return gaps.length > 0 && gaps.every((gap) => (values[gap.gap_number] ?? '').trim().length > 0);
    }
    case 'matching': {
      const pairs = question.matching_pairs ?? [];
      const { matches } = answer as MatchingAnswer;
      return pairs.length > 0 && pairs.every((pair) => matches[pair.id] != null);
    }
    case 'sentence_build': {
      const items = question.sentence_build ?? [];
      const { sentences } = answer as SentenceBuildAnswer;
      return items.length > 0 && items.every((_, i) => (sentences[i] ?? '').trim().length > 0);
    }
    case 'translation':
      return (answer as TranslationAnswer).text.trim().length > 0;
    case 'dictation':
      return (answer as DictationAnswer).text.trim().length > 0;
    case 'listen_and_choose':
      return (answer as ListenAndChooseAnswer).selectedIndex != null;
    case 'sentence_surgery':
      return (answer as SentenceSurgeryAnswer).selectedOptionIndex != null;
  }
}

/** Scores a completed answer against the question's correct-answer data. */
export function gradeQuestion(question: Question, answer: QuestionAnswerValue): QuestionResult {
  const points = question.points || 0;

  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false': {
      const { selectedChoiceId } = answer as MultipleChoiceAnswer;
      const choice = question.choices?.find((c) => c.id === selectedChoiceId);
      const isCorrect = !!choice?.is_correct;
      return { isCorrect, points: isCorrect ? points : 0 };
    }
    case 'short_answer': {
      const { text } = answer as ShortAnswerAnswer;
      const entries = question.typing_exercise ?? [];
      const isCorrect = entries.some((entry) =>
        answerMatches(text, entry.correct_answer, entry.is_case_sensitive)
      );
      return { isCorrect, points: isCorrect ? points : 0 };
    }
    case 'fill_in_the_blank': {
      const gaps = question.gap_filling ?? [];
      const { values } = answer as GapFillingAnswer;
      if (gaps.length === 0) return { isCorrect: false, points: 0 };
      const correctCount = gaps.filter((gap) =>
        gap.correct_answer.some((correct) => normalize(correct) === normalize(values[gap.gap_number] ?? ''))
      ).length;
      const ratio = correctCount / gaps.length;
      return { isCorrect: ratio === 1, points: Math.round(points * ratio) };
    }
    case 'matching': {
      const pairs = question.matching_pairs ?? [];
      const { matches } = answer as MatchingAnswer;
      if (pairs.length === 0) return { isCorrect: false, points: 0 };
      const correctCount = pairs.filter((pair) => matches[pair.id] === pair.id).length;
      const ratio = correctCount / pairs.length;
      return { isCorrect: ratio === 1, points: Math.round(points * ratio) };
    }
    case 'sentence_build': {
      const items = question.sentence_build ?? [];
      const { sentences } = answer as SentenceBuildAnswer;
      if (items.length === 0) return { isCorrect: false, points: 0 };
      const correctCount = items.filter(
        (item, i) => normalize(sentences[i] ?? '') === normalize(item.correct_answer)
      ).length;
      const ratio = correctCount / items.length;
      return { isCorrect: ratio === 1, points: Math.round(points * ratio) };
    }
    case 'translation': {
      const data = question.translation;
      if (!data) return { isCorrect: false, points: 0 };
      const isCorrect = answerMatches((answer as TranslationAnswer).text, data.correct_answer);
      return { isCorrect, points: isCorrect ? points : 0 };
    }
    case 'dictation': {
      const data = question.dictation;
      if (!data) return { isCorrect: false, points: 0 };
      const isCorrect = answerMatches((answer as DictationAnswer).text, data.correct_answer);
      return { isCorrect, points: isCorrect ? points : 0 };
    }
    case 'listen_and_choose': {
      const data = question.listen_and_choose;
      const { selectedIndex } = answer as ListenAndChooseAnswer;
      const option = selectedIndex != null ? data?.options[selectedIndex] : undefined;
      const isCorrect = !!option?.is_correct;
      return { isCorrect, points: isCorrect ? points : 0 };
    }
    case 'sentence_surgery': {
      const data = question.sentence_surgery;
      const { selectedOptionIndex } = answer as SentenceSurgeryAnswer;
      const option = selectedOptionIndex != null ? data?.options[selectedOptionIndex] : undefined;
      const isCorrect = !!option?.is_correct;
      return { isCorrect, points: isCorrect ? points : 0 };
    }
  }
}
