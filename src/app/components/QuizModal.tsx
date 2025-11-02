import React, { useState, useEffect } from "react";
import Image from "next/image";

type Option = {
  id: string;
  label: string;
  content: string;
};

type Question = {
  id: string;
  question: string;
  options: Option[];
  correctAnswer: string;
};

type Quiz = {
  id: string;
  title: string;
  questions: Question[];
};

type UserAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  question: Question;
  selectedOption: Option | null;
  isCorrect: boolean;
};

type QuizAttempt = {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string | null;
  timeTaken: number | null;
  answers: UserAnswer[];
  quiz: Quiz;
};

interface QuizModalProps {
  quizId: string;
  userId: string;
  onClose: () => void;
}

export default function QuizModal({ quizId, userId, onClose }: QuizModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | null>>({});
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Timer effect - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    startQuiz();
  }, []);

  async function startQuiz() {
    try {
      setLoading(true);
      const response = await fetch(`/api/quiz/${quizId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error("Failed to start quiz");

      const data = await response.json();
      setAttempt(data.attempt);
      setStartTime(Date.now());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerSelect(questionId: string, optionId: string) {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function goToNextQuestion() {
    if (attempt && currentQuestionIndex < attempt.quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }

  function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }

  async function handleSubmit() {
    if (!attempt) return;

    try {
      setSubmitting(true);
      const timeTaken = elapsedTime; // Use the tracked elapsed time

      const answers = attempt.quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: userAnswers[q.id] || null,
      }));

      const response = await fetch(`/api/quiz/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          answers,
          timeTaken,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit quiz");

      const data = await response.json();
      setAttempt(data.attempt);
      setShowResults(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Format time as MM:SS
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <Image src="/loader.svg" width={40} height={40} alt="" className="spinner" />
            <p className="text-xl text-gray-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  if (showResults) {
    const passed = attempt.percentage >= 70;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl p-8 max-w-4xl w-full my-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              {passed ? "🎉 Congratulations!" : "📚 Keep Practicing!"}
            </h2>
            <p className="text-xl text-gray-600">Quiz Complete</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-purple-50 p-6 rounded-2xl text-center">
              <p className="text-gray-600 mb-2">Score</p>
              <p className="text-4xl font-bold text-purple-600">
                {attempt.score}/{attempt.totalQuestions}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-2xl text-center">
              <p className="text-gray-600 mb-2">Percentage</p>
              <p className="text-4xl font-bold text-purple-600">
                {attempt.percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {attempt.timeTaken && (
            <div className="bg-gray-50 p-4 rounded-2xl text-center mb-8">
              <p className="text-gray-600">
                Time Taken: <span className="font-bold text-purple-600">{formatTime(attempt.timeTaken)}</span>
              </p>
            </div>
          )}

          <h3 className="text-2xl font-bold mb-4">Detailed Results</h3>
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {attempt.answers.map((ans, idx) => (
              <div
                key={ans.questionId}
                className={`p-6 rounded-2xl border-2 ${
                  ans.isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{ans.isCorrect ? "✅" : "❌"}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-lg mb-2">
                      Question {idx + 1}: {ans.question.question}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Your answer:</span>{" "}
                      {ans.selectedOption ? `${ans.selectedOption.label}. ${ans.selectedOption.content}` : "Skipped"}
                    </p>
                    {!ans.isCorrect && (
                      <p className="text-green-700 mt-2">
                        <span className="font-semibold">Correct answer:</span>{" "}
                        {ans.question.options.find((opt) => opt.label === ans.question.correctAnswer)?.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 font-semibold"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowResults(false);
                setUserAnswers({});
                setCurrentQuestionIndex(0);
                startQuiz();
              }}
              className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 font-semibold"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = attempt.quiz.questions[currentQuestionIndex];
  const answeredCount = Object.values(userAnswers).filter((a) => a !== null).length;
  const progress = ((currentQuestionIndex + 1) / attempt.quiz.questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{attempt.quiz.title}</h2>
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} of {attempt.quiz.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Timer Display */}
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
              <span className="text-2xl">⏱️</span>
              <span className="font-mono text-lg font-bold text-purple-700">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Answered: {answeredCount}/{attempt.quiz.questions.length}
          </p>
        </div>

        {/* Question */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = userAnswers[currentQuestion.id] === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    className="mt-1 w-5 h-5 text-purple-500"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-purple-600">{option.label}.</span>{" "}
                    <span className="text-gray-800">{option.content}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            ← Previous
          </button>

          {currentQuestionIndex < attempt.quiz.questions.length - 1 ? (
            <button
              onClick={goToNextQuestion}
              className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 font-semibold"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Image src="/loader.svg" width={20} height={20} alt="" className="spinner" />
                  Submitting...
                </>
              ) : (
                "Submit Quiz"
              )}
            </button>
          )}
        </div>

        {/* Question Overview */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-600 mb-3">Quick Navigation:</p>
          <div className="flex flex-wrap gap-2">
            {attempt.quiz.questions.map((_, idx) => {
              const questionId = attempt.quiz.questions[idx].id;
              const isAnswered = userAnswers[questionId] !== undefined && userAnswers[questionId] !== null;
              const isCurrent = idx === currentQuestionIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-10 h-10 rounded-full font-semibold transition-all ${
                    isCurrent
                      ? "bg-purple-500 text-white scale-110"
                      : isAnswered
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}