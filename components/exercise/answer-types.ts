export interface MultipleChoiceAnswer {
  selectedChoiceId: string | null;
}
export interface ShortAnswerAnswer {
  text: string;
}
export interface GapFillingAnswer {
  /** gap_number -> chosen text */
  values: Record<number, string>;
}
export interface MatchingAnswer {
  /** pair id (from the left column) -> pair id (from the right column) */
  matches: Record<string, string>;
}
export interface SentenceBuildAnswer {
  /** one built sentence per `sentence_build[]` entry, same index */
  sentences: string[];
}
export interface TranslationAnswer {
  text: string;
}
export interface DictationAnswer {
  text: string;
}
export interface ListenAndChooseAnswer {
  selectedIndex: number | null;
}
export interface SentenceSurgeryAnswer {
  /** index of the word the student tapped as the mistake */
  foundIndex: number | null;
  selectedOptionIndex: number | null;
}

export type QuestionAnswerValue =
  | MultipleChoiceAnswer
  | ShortAnswerAnswer
  | GapFillingAnswer
  | MatchingAnswer
  | SentenceBuildAnswer
  | TranslationAnswer
  | DictationAnswer
  | ListenAndChooseAnswer
  | SentenceSurgeryAnswer;

export interface QuestionResult {
  isCorrect: boolean;
  points: number;
}
