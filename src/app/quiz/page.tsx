"use client";

import { useMemo, useState } from "react";
import { SKILLS, type OptionKey, type Question, type SkillId } from "@/data/questions";
import {
  calculatePercentage,
  calculateScore,
  generateRandomQuestions,
  mapPercentageToTP,
  type AnswerMap,
} from "@/lib/quiz";

type QuizResult = {
  score: number;
  total: number;
  percentage: number;
  tp: string;
};

const DEFAULT_SKILL: SkillId = "kemahiran-saintifik";

export default function QuizPage() {
  const [selectedSkillId, setSelectedSkillId] = useState<SkillId>(DEFAULT_SKILL);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Partial<AnswerMap>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  const selectedSkill = useMemo(
    () => SKILLS.find((skill) => skill.id === selectedSkillId),
    [selectedSkillId],
  );

  const answeredCount = useMemo(
    () => quizQuestions.filter((question) => answers[question.id]).length,
    [answers, quizQuestions],
  );

  const handleStartQuiz = () => {
    const questions = generateRandomQuestions(selectedSkillId, 5);

    setQuizQuestions(questions);
    setAnswers({});
    setResult(null);
    setError("");
  };

  const handleAnswerChange = (questionId: string, answer: OptionKey) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));
    setResult(null);
    setError("");
  };

  const handleSubmit = () => {
    if (quizQuestions.length === 0) {
      setError("Sila mula kuiz dahulu.");
      return;
    }

    if (answeredCount < quizQuestions.length) {
      setError("Sila jawab semua soalan sebelum hantar.");
      return;
    }

    const score = calculateScore(quizQuestions, answers);
    const percentage = calculatePercentage(score, quizQuestions.length);
    const tp = mapPercentageToTP(percentage);

    setResult({
      score,
      total: quizQuestions.length,
      percentage,
      tp,
    });
    setError("");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">TPHelper</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Kuiz Pemudahcara PBD</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Sains Tahun 3. Pilih kemahiran, jana 5 soalan rawak, kemudian dapatkan cadangan TP secara automatik.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-900">Subjek</p>
            <p className="mt-1 text-slate-600">Sains Tahun 3</p>
          </div>
        </section>

        <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm font-medium text-slate-900">
            Kemahiran
            <select
              value={selectedSkillId}
              onChange={(event) => {
                setSelectedSkillId(event.target.value as SkillId);
                setQuizQuestions([]);
                setAnswers({});
                setResult(null);
                setError("");
              }}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {SKILLS.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleStartQuiz}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Mula Kuiz
          </button>
        </section>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {quizQuestions.length > 0 ? (
          <section className="mt-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedSkill?.name}</h2>
                <p className="text-sm text-slate-600">
                  Dijawab: {answeredCount}/{quizQuestions.length}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white md:mt-0"
              >
                Hantar Jawapan
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {quizQuestions.map((question, index) => {
                const selectedAnswer = answers[question.id];
                const isSubmitted = result !== null;
                const isCorrect = selectedAnswer === question.correctAnswer;

                return (
                  <article key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase text-slate-500">Soalan {index + 1}</p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">{question.stem}</h3>
                      </div>
                      {question.difficulty ? (
                        <span className="w-fit rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                          {question.difficulty}
                        </span>
                      ) : null}
                    </div>

                    {question.imageUrl ? (
                      // Native img keeps this helper ready for local, uploaded, or AI-generated question images.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={question.imageUrl}
                        alt={question.imageAlt ?? "Gambar soalan"}
                        className="mt-3 max-h-64 w-full rounded-md border border-slate-200 object-contain"
                      />
                    ) : null}

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {question.options.map((option) => {
                        const optionIsSelected = selectedAnswer === option.key;
                        const optionIsCorrect = question.correctAnswer === option.key;
                        const submittedClass = !isSubmitted
                          ? ""
                          : optionIsCorrect
                            ? "border-emerald-500 bg-emerald-50"
                            : optionIsSelected
                              ? "border-red-500 bg-red-50"
                              : "";

                        return (
                          <label
                            key={option.key}
                            className={`flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm ${submittedClass}`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.key}
                              checked={optionIsSelected}
                              disabled={isSubmitted}
                              onChange={() => handleAnswerChange(question.id, option.key)}
                              className="mt-1"
                            />
                            <span>
                              <span className="font-semibold">{option.key}.</span> {option.text}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {result ? (
                      <p className={`mt-3 text-sm font-medium ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                        {isCorrect
                          ? "Betul"
                          : `Salah. Jawapan betul: ${question.correctAnswer}`}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Pilih kemahiran dan tekan Mula Kuiz untuk jana set soalan rawak.
          </section>
        )}

        {result ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Keputusan</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Jumlah betul</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result.score}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Jumlah soalan</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result.total}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Peratus</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result.percentage}%</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">TP dicadangkan</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result.tp}</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
