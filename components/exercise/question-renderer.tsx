import { DictationQuestion } from '@/components/exercise/dictation';
import { GapFillingQuestion } from '@/components/exercise/gap-filling';
import { ListenAndChooseQuestion } from '@/components/exercise/listen-and-choose';
import { MatchingQuestion } from '@/components/exercise/matching';
import { MultipleChoiceQuestion } from '@/components/exercise/multiple-choice';
import { SentenceBuildQuestion } from '@/components/exercise/sentence-build';
import { SentenceSurgeryQuestion } from '@/components/exercise/sentence-surgery';
import { ShortAnswerQuestion } from '@/components/exercise/short-answer';
import { TranslationQuestion } from '@/components/exercise/translation';
import type {
  DictationAnswer,
  GapFillingAnswer,
  ListenAndChooseAnswer,
  MatchingAnswer,
  MultipleChoiceAnswer,
  QuestionAnswerValue,
  SentenceBuildAnswer,
  SentenceSurgeryAnswer,
  ShortAnswerAnswer,
  TranslationAnswer,
} from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

export function QuestionRenderer({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: QuestionAnswerValue;
  onChange: (value: QuestionAnswerValue) => void;
  showResult: boolean;
}) {
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return (
        <MultipleChoiceQuestion
          question={question}
          value={value as MultipleChoiceAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'short_answer':
      return (
        <ShortAnswerQuestion
          question={question}
          value={value as ShortAnswerAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'fill_in_the_blank':
      return (
        <GapFillingQuestion
          question={question}
          value={value as GapFillingAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'matching':
      return (
        <MatchingQuestion
          question={question}
          value={value as MatchingAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'sentence_build':
      return (
        <SentenceBuildQuestion
          question={question}
          value={value as SentenceBuildAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'translation':
      return (
        <TranslationQuestion
          question={question}
          value={value as TranslationAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'dictation':
      return (
        <DictationQuestion
          question={question}
          value={value as DictationAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'listen_and_choose':
      return (
        <ListenAndChooseQuestion
          question={question}
          value={value as ListenAndChooseAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    case 'sentence_surgery':
      return (
        <SentenceSurgeryQuestion
          question={question}
          value={value as SentenceSurgeryAnswer}
          onChange={onChange}
          showResult={showResult}
        />
      );
    default:
      return null;
  }
}
