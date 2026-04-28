import { QUESTIONS, type OptionKey, type Question, type SkillId } from "@/data/questions";

export type AnswerMap = Record<string, OptionKey>;

export function getQuestionsBySkill(skillId: SkillId) {
  return QUESTIONS.filter((question) => question.skillId === skillId);
}

export function generateRandomQuestions(skillId: SkillId, count = 5) {
  const questions = getQuestionsBySkill(skillId);
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

export function calculateScore(questions: Question[], answers: Partial<AnswerMap>) {
  return questions.reduce((score, question) => {
    return answers[question.id] === question.correctAnswer ? score + 1 : score;
  }, 0);
}

export function calculatePercentage(score: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((score / total) * 100);
}

export function mapPercentageToTP(percentage: number) {
  if (percentage <= 39) return "TP1";
  if (percentage <= 54) return "TP2";
  if (percentage <= 69) return "TP3";
  if (percentage <= 79) return "TP4";
  if (percentage <= 89) return "TP5";

  return "TP6";
}
