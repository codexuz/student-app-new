/**
 * Shared shapes for the course → unit → lesson → exercise → speaking tree.
 * Field names mirror the backend entities/DTOs exactly (see `units`,
 * `lesson`, `exercise`, `speaking` modules) rather than being redesigned,
 * since the client only reads these — reshaping them would just add a
 * translation layer with nothing to translate.
 */

export type ExerciseCategory = 'grammar' | 'reading' | 'listening' | 'writing';

export type QuestionType =
  | 'multiple_choice'
  | 'fill_in_the_blank'
  | 'true_false'
  | 'short_answer'
  | 'matching'
  | 'sentence_build'
  | 'translation'
  | 'dictation'
  | 'listen_and_choose'
  | 'sentence_surgery';

export type SpeakingType = 'pronunciation' | 'speaking';
export type SpeakingResponseType = 'part1' | 'part2' | 'part3' | 'pronunciation';

// ---------------------------------------------------------------------------
// Roadmap (GET /units/roadmap/me/course/:courseId/group/:groupId)
// ---------------------------------------------------------------------------

export interface RoadmapLesson {
  lesson_id: string;
  lesson_order: number;
  lesson_title: string;
  lesson_type: 'lesson' | 'practice' | 'test';
  status: 'locked' | 'unlocked';
  total_homeworks: number;
  submitted_count: number;
  total_tasks: number;
  completed_tasks: number;
  total_exercises: number;
  completed_exercises: number;
  total_speaking: number;
  completed_speaking: number;
  completed_sections: string[];
  completed_sections_count: number;
  total_sections: number;
  section_percentage: number;
  task_percentage: number;
  average_score: number | null;
  is_completed: boolean;
}

export interface RoadmapUnit {
  unit_id: string;
  unit_title: string;
  unit_order: number;
  status: 'locked' | 'unlocked';
  completed: number;
  total: number;
  percentage: number;
  lessons: RoadmapLesson[];
}

export interface CourseProgressItem {
  course_id: string;
  course_name: string;
  group_id: string | null;
  completed: number;
  total: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Lesson content (GET /lessons/:id/full)
// ---------------------------------------------------------------------------

export interface LessonContentBlock {
  id: number;
  type: 'text' | 'image' | 'audio' | 'video' | 'youtube_embed' | 'iframe';
  content: string;
}

export interface LessonContentResource {
  id: number;
  type: 'pdf' | 'doc' | 'excel' | 'docx';
  url: string;
}

export interface LessonContentItem {
  id: string;
  title: string;
  content: LessonContentBlock[];
  resources: LessonContentResource[] | null;
  lessonId: string;
}

/** The OpenAI-graded breakdown attached to a writing section's `answers.assessment` once checked (see `openai.service.ts`'s `writingResponseFormat`). */
export interface WritingAssessment {
  score: number;
  grammarScore: number;
  vocabularyScore: number;
  coherenceScore: number;
  taskResponseScore: number;
  grammarFeedback: string;
  vocabularyFeedback: string;
  coherenceFeedback: string;
  taskResponseFeedback: string;
  overallFeedback: string;
  correctedText: string;
}

export interface ExerciseSubmissionSummary {
  id: string;
  exercise_id: string;
  score: number | null;
  section: string;
  /** For writing, carries `{ writing: string, assessment?: WritingAssessment }` once graded. */
  answers: Record<string, unknown> | null;
  completed: boolean;
}

export interface ExerciseSummary {
  id: string;
  title: string;
  exercise_type: ExerciseCategory;
  /** Present once merged with the student's submission history (list endpoints only). */
  isCompleted?: boolean;
  score?: number;
  /** The list endpoint eager-loads full question data (same shape as `Exercise.questions`). */
  questions?: Question[];
  /** The raw submission record — needed to show full past results (e.g. writing feedback), not just the score. */
  submission?: ExerciseSubmissionSummary | null;
}

export interface SpeakingTask {
  id: string;
  lessonId: string;
  title: string;
  type: SpeakingType;
  /** Present on `speaking/lesson/:id/type/:type` (merged with submission history). */
  isSubmitted?: boolean;
  submissionDetails?: SpeakingResponse | null;
}

export interface LessonFull {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  type: 'lesson' | 'practice' | 'test';
  moduleId: string;
  theory: LessonContentItem[];
  exercises: ExerciseSummary[];
  speaking: SpeakingTask[];
}

// ---------------------------------------------------------------------------
// Exercise / question sub-shapes (GET /exercise/:id)
// ---------------------------------------------------------------------------

export interface Choice {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface GapFillingItem {
  id: string;
  question_id: string;
  gap_number: number;
  correct_answer: string[];
}

export interface MatchingPair {
  id: string;
  question_id: string;
  left_item: string;
  right_item: string;
}

export interface TypingExerciseData {
  id: string;
  question_id: string;
  correct_answer: string;
  is_case_sensitive: boolean;
}

export interface SentenceBuildItem {
  id: string;
  question_id: string;
  given_text: string;
  correct_answer: string;
}

export interface TranslationData {
  id: string;
  question_id: string;
  given_text: string;
  correct_answer: string;
}

export interface DictationData {
  id: string;
  question_id: string;
  audio: string;
  correct_answer: string;
}

export interface ListenAndChooseOption {
  text: string;
  is_correct: boolean;
}

export interface ListenAndChooseData {
  id: string;
  question_id: string;
  audio: string;
  options: ListenAndChooseOption[];
}

export interface SentenceSurgeryOption {
  text: string;
  is_correct: boolean;
}

export interface SentenceSurgeryData {
  id: string;
  question_id: string;
  error_word: string;
  error_start: number;
  error_end: number;
  options: SentenceSurgeryOption[];
}

export interface Question {
  id: string;
  exercise_id: string;
  question_type: QuestionType;
  question_text: string;
  points: number;
  order_number: number;
  sample_answer: string | null;
  choices?: Choice[];
  gap_filling?: GapFillingItem[];
  matching_pairs?: MatchingPair[];
  typing_exercise?: TypingExerciseData[];
  sentence_build?: SentenceBuildItem[];
  translation?: TranslationData;
  dictation?: DictationData;
  listen_and_choose?: ListenAndChooseData;
  sentence_surgery?: SentenceSurgeryData;
}

export interface Exercise {
  id: string;
  title: string;
  exercise_type: ExerciseCategory;
  audio_url: string | null;
  image_url: string | null;
  video_url: string | null;
  instructions: string | null;
  content: string | null;
  isActive: boolean;
  lessonId: string;
  questions: Question[];
}

// ---------------------------------------------------------------------------
// Speaking (lesson-integrated system)
// ---------------------------------------------------------------------------

export interface IeltsPart1Question {
  id: string;
  question: string;
  image_url?: string | null;
  audio_url?: string | null;
  sample_answer?: string | null;
}

export interface PronunciationPhrase {
  id: string;
  speaking_id: string;
  word_to_pronunce: string;
  audio_url: string | null;
}

export interface SpeakingResponseDetail {
  question: string | null;
  transcription: string | null;
  audio_url: string | null;
  question_id?: string | number | null;
}

export interface SpeakingAssessment {
  fluency: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  feedback?: string;
  fluencyFeedback?: string;
  grammarFeedback?: string;
  vocabularyFeedback?: string;
  pronunciationFeedback?: string;
  /** The per-question breakdown, merged in alongside the scores once assessed. */
  responses?: SpeakingResponseDetail[];
}

export interface SpeakingResponse {
  id: string;
  speaking_id: string;
  student_id: string;
  response_type: SpeakingResponseType;
  audio_url: string[];
  transcription: string | null;
  result: SpeakingAssessment | { responses: SpeakingResponseDetail[] } | null;
  pronunciation_score: number | null;
  feedback: string | null;
}

// ---------------------------------------------------------------------------
// Homework submission (grading)
// ---------------------------------------------------------------------------

export type HomeworkSection = 'reading' | 'listening' | 'grammar' | 'writing' | 'speaking';

export interface SubmitHomeworkSectionInput {
  lesson_id?: string;
  exercise_id?: string;
  speaking_id?: string;
  homework_id?: string;
  percentage?: number;
  section: HomeworkSection;
  answers?: Record<string, unknown>;
}

export interface HomeworkRewards {
  coins: number;
  streak: number;
  bonusPoints: number;
  totalEarnedPoints: number;
}

export interface SubmitHomeworkSectionResult {
  submission: { id: string; homework_id: string | null; lesson_id: string | null };
  section: { id: string; score: number | null; section: HomeworkSection; answers: Record<string, unknown> };
  rewards: HomeworkRewards | null;
}

// ---------------------------------------------------------------------------
// Homework stats (GET /homework-submissions/student/:studentId/stats)
// ---------------------------------------------------------------------------

export interface HomeworkSectionStats {
  average: number;
  submissions: number;
  trend: number[];
}

export interface HomeworkStats {
  overall: number;
  sections: Partial<Record<HomeworkSection, HomeworkSectionStats>>;
}
