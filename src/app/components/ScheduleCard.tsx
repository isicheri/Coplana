import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QuizModal from "./QuizModal";
import { Quiz } from "../dashboard/page";

type Subtopic = { id: string; t: string; title: string; completed: boolean };
type PlanItem = {
  id: string;
  range: string;
  topic: string;
  subtopics: Subtopic[];
  quiz?: Partial<Quiz>;
};
type ScheduleType = {
  id: string;
  title: string;
  remindersEnabled: boolean;
  startDate: string | null;
  createdAt: string;
  planItems: PlanItem[];
};


interface ScheduleCardProps {
  schedule: ScheduleType;
  onToggleReminders: (id: string, enable: boolean) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onToggleSubtopicCompleted: (
    scheduleId: string,
    range: string,
    subtopicIdx: number,
    completed: boolean
  ) => void;
  onRegenerateQuiz: (planItemId: string) => Promise<void>; 
  userId: string | null;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule: s,
  onToggleReminders,
  onDelete,
  onToggleSubtopicCompleted,
  onRegenerateQuiz,
  userId,
}) => {
  // Local states
  const [expanded, setExpanded] = useState(false);
  const [enablingReminder, setEnablingReminder] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const [startingQuiz, setStartingQuiz] = useState(false);

  const handleExpand = () => setExpanded((prev) => !prev);

  const handleToggleReminders = async () => {
    setEnablingReminder(true);
    try {
      await onToggleReminders(s.id, !s.remindersEnabled);
    } finally {
      setEnablingReminder(false);
    }
  };

  const handleDelete = async () => {
    if (deletingSchedule) return;
    setDeletingSchedule(true);
    try {
      await onDelete(s.id);
    } finally {
      setDeletingSchedule(false);
    }
  };

 function handleStartQuiz(quizId: string) {
  if (startingQuiz) return; // Prevent double-click
  setStartingQuiz(true);
  setSelectedQuizId(quizId);
  setShowQuizModal(true);
  // Reset after modal opens
  setTimeout(() => setStartingQuiz(false), 1000);
}

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      setHeight(expanded ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [expanded]);

  // Progress logic
  const totalSubtopics =
    s.planItems?.reduce((acc, item) => acc + (item.subtopics?.length ?? 0), 0) ?? 0;
  const completedSubtopics =
    s.planItems?.reduce(
      (acc, item) => acc + (item.subtopics?.filter((sub) => sub.completed).length ?? 0),
      0
    ) ?? 0;
  const scheduleProgress = totalSubtopics ? (completedSubtopics / totalSubtopics) * 100 : 0;

  // Helper: Check if all subtopics in a planItem are completed
  const isItemFullyCompleted = (item: PlanItem) => {
    return item.subtopics?.every((sub) => sub.completed) ?? false;
  };

  // Helper: Check if quiz has been completed by user
  const hasCompletedQuiz = (item: PlanItem) => {
    if (!item.quiz?.attempts) return false;
    return item.quiz.attempts.some((attempt) => attempt.completedAt !== null);
  };

  return (
    <>
      <div className="p-4 rounded-xl bg-gry/8">
        <div className="flex justify-between mb-2 items-center">
          <div>
            <div
              onClick={handleExpand}
              className="head(title-and-dropdown) hover:text-purple-600 duration-200 cursor-pointer font-bold flex items-center gap-2 text-xl capitalize text-black pb-2"
            >
              <Image
                src="/arrow-down.svg"
                className={` duration-200 ${expanded ? "-scale-y-100" : "scale-y-100"}`}
                alt=""
                width={30}
                height={30}
              />
              {s.title}
              <div className="p-1 text-sm px-3 rounded-full bg-gry/15 text-gray">
                {s.planItems.length} STAGE{s.planItems.length > 1 ? "S" : ""}
              </div>
            </div>
            <div className="meter-bar p-1 mt-1 h-max w-full bg-gry/15 bg-gradient-to-br from-gry/15  rounded-full relative">
              <div
                className="meter h-4 bg-green-500 duration-500 ease-out rounded-full"
                style={{ width: `${scheduleProgress}%` }}
              ></div>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray">{`${Math.round(
                scheduleProgress
              )}%`}</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              title="Upgrade to Pro to enable multiple reminders"
              onClick={handleToggleReminders}
              className={`p-3 notf-btn rounded-2xl cursor-pointer text-sm ${
                s.remindersEnabled
                  ? "bg-green-500 text-white"
                  : enablingReminder
                  ? "bg-amber-400 text-white"
                  : "bg-gry/10 hover:bg-gry/15 text-gray"
              } active:scale-90 duration-200`}
              disabled={enablingReminder}
            >
              {s.remindersEnabled ? (
                <div className="notf-btn flex  items-center ">
                  <Image alt="" width={20} height={20} src="/bell-fill.svg" />
                  <div className="label duration-500 whitespace-nowrap ">Reminder Enabled</div>
                </div>
              ) : enablingReminder ? (
                <div className="notf-btn flex items-center ">
                  <Image
                    alt=""
                    src="/loader.svg"
                    width={20}
                    height={20}
                    className="spinner"
                  />
                  <div className="label duration-500 whitespace-nowrap ">Toggling</div>
                </div>
              ) : (
                <div className=" flex items-center ">
                  <Image alt="" width={20} height={20} src="/bell-outline.svg" />
                  <div className="label duration-500 whitespace-nowrap ">Turn on Reminder</div>
                </div>
              )}
            </button>

            <button
              title="Delete Schedule"
              onClick={handleDelete}
              className={`delete ${
                deletingSchedule ? "bg-red-400" : "bg-red-500/15"
              } p-3  rounded-2xl cursor-pointer`}
              disabled={deletingSchedule}
            >
              {deletingSchedule ? (
                <Image
                  alt=""
                  width={20}
                  height={20}
                  src="/loader.svg"
                  className="spinner"
                />
              ) : (
                <Image alt="" width={20} height={20} src="/delete.svg" />
              )}
            </button>
            <button
              title="Export Schedules as files (Feature in progress)"
              className={`p-3 h-max notf-btn cursor-not-allowed rounded-2xl text-sm bg-blk active:scale-90 duration-200`}
              disabled={true}
            >
              <Image alt="" width={16} height={16} src="/download.svg" />
            </button>
          </div>
        </div>
        <div className="text-sm text-gry/90">
          Created: {new Date(s.createdAt).toLocaleDateString()}
        </div>

        {/* ALL SCHEDULE ITEMS */}
        <div
          style={{
            overflow: "hidden",
            transition: "0.7s ease",
            opacity: expanded ? 1 : 0,
            transform: expanded ? "scaleY(1) translateY(0)" : "scaleY(0.85) translateY(-70px)",
            maxHeight: height,
          }}
          ref={contentRef}
          className={`Saved-Schedules-Panel ease-out duration-500 space-y-4 mt-2`}
        >
          {s.planItems?.map((item, index) => {
            const fullyCompleted = isItemFullyCompleted(item);
            const quizCompleted = hasCompletedQuiz(item);
            
            return (
              <div
                style={{
                  transition: "0.5s ease",
                  opacity: expanded ? 1 : 0,
                  transitionDelay: `${index * 0.15}s`,
                  transform: expanded ? "scale(1) translateX(0)" : "scale(0.7) translateX(-140px)",
                }}
                key={item.id}
                className={`scheduleCard border border-gry/20 p-2 px-4 rounded-2xl ${
                  fullyCompleted ? "bg-green-50/50" : "bg-white/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xl py-2 mb-1 text-black">{item.topic}</div>
                  {fullyCompleted && (
                    <div className="text-green-600 text-sm font-semibold flex items-center gap-1">
                      <span>✅</span> Completed
                    </div>
                  )}
                </div>

                {item.subtopics?.map((sub, idx) => (
                  <label
                    key={sub.id}
                    className={`flex items-center gap-2 text-lg text-gray ${
                      fullyCompleted ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                    }`}
                  >
                    <div className="custom-checkbox w-4 h-4 border-3 flex items-center justify-center border-purple-500 rounded-md">
                      <div
                        style={{ display: sub.completed ? "block" : "none" }}
                        className="w-2 h-2 rounded-sm  shrink-0 bg-purple-500"
                      ></div>
                    </div>
                    <input
                      type="checkbox"
                      hidden
                      checked={sub.completed}
                      disabled={fullyCompleted} // Disable if all completed
                      onChange={() =>
                        !fullyCompleted && onToggleSubtopicCompleted(s.id, item.range, idx, !sub.completed)
                      }
                    />
                    <div
                      title={
                        fullyCompleted
                          ? "All tasks completed - locked"
                          : sub.completed
                          ? "Mark as undone"
                          : "Mark as complete"
                      }
                      className={`${
                        sub.completed ? "line-through text-gray-400" : "text-black"
                      } pb-3 border-b border-gry/15 ${
                        !fullyCompleted && "hover:bg-gry/10"
                      } px-4 duration-200 rounded-xl w-full`}
                    >
                      {sub.title} <p className="text-sm text-gray">({item.range})</p>
                    </div>
                  </label>
                ))}
                {/* Quiz Button - Only show if quiz exists, all tasks complete, and not already taken */}
                {item.quiz && fullyCompleted && !quizCompleted && (
               <button
  onClick={() => handleStartQuiz(item.quiz!.id!)}
  disabled={startingQuiz}
  className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 flex items-center gap-2 font-semibold transition-all hover:shadow-lg disabled:opacity-50"
>
  {startingQuiz ? "Opening..." : "📝 Take Quiz"}
</button>
                )}

                {/* Quiz Completed Badge */}
                {item.quiz && quizCompleted && (
                  <div className="mt-4 px-6 py-2 bg-green-500/20 text-green-700 rounded-full flex items-center gap-2 font-semibold">
                    ✅ Quiz Completed
                  </div>
                )}

              {!item.quiz && fullyCompleted && (
  <button
    onClick={() => onRegenerateQuiz?.(item.id)}
    className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 flex items-center gap-2 font-semibold transition-all hover:shadow-lg disabled:opacity-50"
  >
    📝 Generate Quiz
  </button>
)}

                <div
                  style={{
                    backgroundImage: `conic-gradient(#692DD0, #692DD0 ${
                      ((item.subtopics?.filter((s) => s.completed).length ?? 0) /
                        (item.subtopics?.length ?? 1)) *
                      360
                    }deg, #cccccc ${
                      ((item.subtopics?.filter((s) => s.completed).length ?? 0) /
                        (item.subtopics?.length ?? 1)) *
                      360
                    }deg)`,
                  }}
                  className="circularProgressBar w-max rounded-full justify-self-end bg-blk p-1.5"
                >
                  <div className="innerCircle rounded-full flex items-center justify-center font-[700]  text-gray bg-wht w-[35px] h-[35px] shrink-0 ">
                    {Math.round(
                      ((item.subtopics?.filter((s) => s.completed).length ?? 0) /
                        (item.subtopics?.length ?? 1)) *
                        100
                    )}
                    %
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && selectedQuizId && userId && (
        <QuizModal
          quizId={selectedQuizId}
          userId={userId}
          onClose={() => {
            setShowQuizModal(false);
            setSelectedQuizId(null);
          }}
        />
      )}
    </>
  );
};

export default ScheduleCard;