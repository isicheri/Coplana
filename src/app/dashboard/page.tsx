"use client";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, ListTodo } from "lucide-react";
// import {toast} from "sooner";
import { useState, useEffect, use } from "react";
import ScheduleCard from "../components/ScheduleCard";
import { Prisma } from "@prisma/client";
import QuizModal from "../components/QuizModal";

export type Quiz = Prisma.QuizGetPayload<{
  include: {
    questions: {
      include: {
        options: true;
      };
    };
    attempts: true;
    planItem: true;
  };
}>;

type Subtopic = { id: string; t: string; title: string; completed: boolean };

type PlanItem = {
  id: string;
  range: string;
  topic: string;
  subtopics: Subtopic[];
};

type ScheduleType = {
  id: string;
  title: string;
  remindersEnabled: boolean;
  startDate: string | null;
  createdAt: string;
  planItems: PlanItem[];
};

type QuizAttempt = Prisma.QuizAttemptGetPayload<{
  include: {
    answers: {
      include: {
        question: {
          include: {
            options: true;
          };
        };
        selectedOption: true;
      };
    };
    quiz: true
  };
}>;

type QuizHistoryStats = {
  totalAttempts: number;
  completedAttempts: number;
  incompleteAttempts: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  passRate: number;
};

type QuizHistoryResponse = {
  attempts: QuizAttempt[];      
  completed: QuizAttempt[];     
  incomplete: QuizAttempt[];    
  stats: QuizHistoryStats;      
};

// Progress stages for AI generation
const PROGRESS_STAGES = [
  { message: "Analyzing topic...", duration: 3000 },
  { message: "Breaking down into subtopics...", duration: 4000 },
  { message: "Creating timeline...", duration: 4000 },
  { message: "Structuring learning path...", duration: 5000 },
  { message: "Optimizing schedule...", duration: 4000 },
  { message: "Finalizing your plan...", duration: 3000 },
];

export default function StudyPlannerApp() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>("");
  const [token,setToken] = useState<string | null>("");


  const [topicInput, setTopicInput] = useState("");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [durationValue, setDurationValue] = useState<number>(1);

  const [generatedPlan, setGeneratedPlan] = useState<PlanItem[] | []>([]);
  const [createdSchedule, setCreatedSchedule] = useState<any | null>(null);
  const [userSchedules, setUserSchedules] = useState<ScheduleType[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [_deletingSchedule, setDeletingSchedule] = useState(false);
  const [_enablingReminder, setEnablingReminder] = useState(false);
  const [_completingTask, setCompletingTask] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [tabMode, setTabMode] = useState<string>("schedules");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());
  const [userQuizzes, setUserQuizzes] = useState<QuizHistoryResponse | null>(null);
  const [resumeLoader,setResumeLoader] = useState<boolean>(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

 const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
  const [page,setPage] = useState<number>(1);

  const [] = useState<number>();

  const studyTopics = [
    "Set Theory",
    "Linear Algebra",
    "Computer Networks",
    "Data Structures",
    "Microeconomics",
    "Operating Systems",
    "Human Psychology",
    "Digital Logic Design",
    "Environmental Science",
    "Artificial Intelligence",
  ];
  const [randomTopic, setRandomTopic] = useState<string>(studyTopics[0]);

useEffect(() => {
  const token = localStorage.getItem("token");
  setToken(token)
},[token])

  function getRandomTopic() {
    const randomIndex = Math.floor(Math.random() * studyTopics.length);
    setRandomTopic(studyTopics[randomIndex]);
  }

  useEffect(() => {
    getRandomTopic();
  }, [generatedPlan]);

  const toggleExpand = (id: string) => {
    setExpandedSchedules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        setExpanded(true);
      } else {
        newSet.add(id);
        setExpanded(false);
      }
      return newSet;
    });
  };

  //Auto-logout
  useEffect(() => {
    const user_item = localStorage.getItem("user");
    if (!user_item) {
      window.location.href = "/onboarding";
    }
  }, []);

  /* ------------------- Progress Animation ------------------- */
  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      setLoadingMessage("");
      return;
    }

    let currentStage = 0;
    setLoadingMessage(PROGRESS_STAGES[0].message);

    const progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage < PROGRESS_STAGES.length) {
        setLoadingStage(currentStage);
        setLoadingMessage(PROGRESS_STAGES[currentStage].message);
      }
    }, PROGRESS_STAGES[0].duration);

    return () => clearInterval(progressInterval);
  }, [loading]);

  /* ------------------- Schedule ------------------- */
async function generatePlan(e: React.FormEvent) {
  e.preventDefault();
  if (!userId) {
    setError("Create a user first");
    return;
  }

  setError(null);
  setLoading(true);
  setGeneratedPlan([]);
  setLoadingStage(0);

  try {
    // Step 1: Start generation
    const res = await fetch("http://localhost:5000/api/v1/schedules/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic: topicInput,
        durationUnit,
        durationValue,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.jobId || !data.statusUrl) {
      throw new Error(data.error || "Failed to start schedule generation");
    }

    console.log("⏳ Schedule generation started, jobId:", data.jobId);

    // Step 2: Poll for completion
    const pollStatusUrl = `http://localhost:5000${data.statusUrl}`;
    let attempts = 0;
    const maxAttempts = 20;

   while (attempts < maxAttempts) {
  await new Promise((r) => setTimeout(r, 2000));

  const statusRes = await fetch(pollStatusUrl, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  const statusData = await statusRes.json();

  if (statusRes.ok && statusData.status === "completed" && statusData.plan) {
    console.log("✅ Plan ready:", statusData.plan);
    setGeneratedPlan(statusData.plan);
    setLoading(false);
    return;
  }

  if (statusData.status === "failed") {
    throw new Error(statusData.error || "Schedule generation failed");
  }

  attempts++;
  console.log(`Waiting... (${attempts})`);
}

    throw new Error("Timed out waiting for plan generation");
  } catch (err: any) {
    console.error("❌ Error generating plan:", err.message);
    setError(err.message);
  } finally {
    setLoading(false);
    setLoadingStage(0);
    setLoadingMessage("");
  }
}


  async function saveGeneratedPlan() {
    if (!userId || !generatedPlan) return;
    setError(null);
    setSavingSchedule(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/schedules/save", {
        method: "POST",
        headers: { "Content-Type": "application/json",  "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          userId,
          title: `${topicInput} Plan`,
          plan: generatedPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save schedule");
      setCreatedSchedule(data.schedule);
      setGeneratedPlan([]);
      setTopicInput("");
      setDurationValue(1);
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function fetchUserSchedules(pageToLoad = 1) {
  try {
    setLoadingMore(true);

    const res = await fetch(`http://localhost:5000/api/v1/schedules/personal?page=${pageToLoad}&limit=5`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch schedules");

    const data = await res.json();

    if (pageToLoad === 1) {
      setUserSchedules(data.schedules || []);
    } else {
      setUserSchedules(prev => [...prev, ...(data.schedules || [])]);
    }

    // update pagination info
    setHasMore(data.schedules?.length >= data.limit);
    setPage(pageToLoad);
  } catch (err) {
    console.error(err);
    setError("Failed to fetch schedules");
  } finally {
    setLoadingMore(false);
  }
  }

  async function deleteUserSchedule(scheduleId: string) {
    if (!scheduleId) return;
    try {
      setDeletingSchedule(true);
      const res = await fetch(`http://localhost:5000/api/v1/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingSchedule(false);
    }
  }

  async function toggleReminders(scheduleId: string, enable: boolean) {
    if (!email) return;
    setError(null);
    setEnablingReminder(true);

    try {
      let startDate = new Date().toISOString();
      if (enable) {
        startDate = new Date().toISOString();
      }

      const res = await fetch(`http://localhost:5000/api/v1/schedules/${scheduleId}/reminders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json",   "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          toggleInput: enable,
          startDate: enable ? startDate : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle reminders");

      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnablingReminder(false);
    }
  }

  /* ------------------- Quiz ------------------- */

  async function fetchUserQuizHistory(status?: "completed" | "incomplete") {
    const url = status
      ? `http://localhost:5000/api/v1/users/quiz-history?status=${status}`
      : `http://localhost:5000/api/v1/users/quiz-history`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quiz history: ${response}`);
    }
    const data = await response.json();
    // console.log("user quiz history: ",data);
    return data;
  }

async function regenerateQuiz(planItemId: string) {
  setError(null);
  try {
    const res = await fetch("http://localhost:5000/api/v1/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json","Authorization": `Bearer ${token}` },
      body: JSON.stringify({ planItemId }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || "Failed to generate quiz");
    }

    // Success! Refresh schedules to show new quiz
    await fetchUserSchedules();
    
    // Optional: Show success message
    // toast.success("Quiz generated successfully! 🎉");
    
  } catch (err: any) {
    setError(err.message);
    console.error("Quiz generation failed:", err);
  }
}

useEffect(() => {
  
  async function loadQuizHistory() {
    if (!userId) return;
    try {
      const quizHistoryData = await fetchUserQuizHistory();
      setUserQuizzes(quizHistoryData);
    } catch (err) {
      console.error("Failed to fetch quiz history:", err);
    }
  }

  loadQuizHistory();
}, [userId]);


  async function toggleSubtopicCompleted(
  scheduleId: string,
  range: string,
  subIdx: number,
  completed: boolean
) {
  if (!userId) return;
  setCompletingTask(true);
  setError(null);

  try {
    const res = await fetch("http://localhost:5000/api/v1/subtopic/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
       },
      body: JSON.stringify({ scheduleId, range, subIdx, completed }),
    });

    const data = await res.json();
    
    // Check if rollback happened
    if (data.rolledBack) {
      setError(data.error); // Show error message
      // Don't update UI - backend already rolled back
      return;
    }

    if (!res.ok) throw new Error(data.error || "Failed to update subtopic");

    // Update local state
    setUserSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return {
          ...s,
          planItems: s.planItems.map((item) => {
            if (item.range !== range) return item;
            return {
              ...item,
              subtopics: item.subtopics.map((sub, idx) =>
                idx === subIdx ? { ...sub, completed } : sub
              ),
            };
          }),
        };
      })
    );
    
    // Show success message if quiz was generated
    if (data.quizGenerated) {
      // Optional: Show toast "Quiz generated! 🎉"
      // toast.success("Quiz generated! 🎉");
    }
    
  } catch (err: any) {
    setError(err.message);
  } finally {
    setCompletingTask(false);
  }
}


  function logout() {
    localStorage.clear();
    setUserId(null);
    setEmail("");
    setUsername("");
    setUserSchedules([]);
    setCreatedSchedule(null);
    setGeneratedPlan([]);
    window.location.pathname = "/onboarding";
  }

  useEffect(() => {
     const user_item = localStorage.getItem("user");
    if(!user_item) return;
    const user = (JSON.parse(user_item) as unknown) as {id: string,email: string,username:string};
    if (user) {
      setUserId(user.id);
      setEmail(user.email);
      setUsername(user.username);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchUserSchedules();
  }, [userId]);


  //schedule infinit scroll effect
  useEffect(() => {
  let timeoutId: NodeJS.Timeout;

  function handleScroll() {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      if (loadingMore || !hasMore) return;
      const scrollY = window.scrollY + window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (scrollY + 300 >= fullHeight) {
        fetchUserSchedules(page + 1);
      }
    }, 200); // 200ms debounce
  }

  window.addEventListener("scroll", handleScroll);
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener("scroll", handleScroll);
  };
}, [page, hasMore, loadingMore]);

  /* ------------------- Render ------------------- */

  return (
    <main className="min-h-screen --font-darker-grotesque bg-gray-100 -bg-[#191919]">
      <div className="header bg-[#18181d] text-white p-4 md:p-6 md:px-8 lg:px-16 flex justify-between max-w- mx-auto">
        <Link href="/">
          <Image src="/logo.svg" width={140} height={40} alt="" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="account-panel flex items-center gap-2">
            <Image alt="" src="/profile-icon.svg" width={25} height={25} />
            <span className=" capitalize ">
              Welcome, <b>{username ? username : "Guest user"}</b>
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 pr-3  pl-4 flex gap-2 rounded-full bg-gry/15 hover:bg-gry/20 duration-200 cursor-pointer"
          >
            Logout
            <Image alt="" src="/logout.svg" width={20} height={20} />
          </button>
        </div>
      </div>

      <div className="body w-full mx-auto p-6 flex flex-col lg:flex-row gap-4">
        {/* Create & Preview Schedule */}
        <div className="Generate-panel lg:sticky top-4 w-full lg:w-[40%] bg-white bg-gry/3--text-white rounded-3xl p-6 h-max">
          <h2 className="New-title text-2xl pb-4 border-b border-gry/20 font-semibold mb-6 text-gray">
            New Study Plan
          </h2>
          <form onSubmit={generatePlan} className="space-y-4 text-lg">
            <input
              type="text"
              placeholder={`Topic (e.g ${randomTopic})`}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full p-3 text-black placeholder:text-gry bg-gry/10 bg-gradient-to-br from-gry/15 via-transparent to-gry/5 outline-none border border-transparent shadow-gry/15 focus:border-wht duration-200 focus:shadow-xl focus:bg-wht rounded-full px-5 "
              required
            />
            <div className="flex gap-2 items-center">
              <div className="text-gry w-max border-r border-gry/20 pr-6 mr-4">Timeframe</div>
              <input
                type="number"
                min={1}
                value={durationValue}
                onChange={(e) => setDurationValue(Number(e.target.value))}
                className=" bg-gry/10 bg-gradient-to-br from-gry/15 via-transparent to-gry/5 outline-none border border-transparent shadow-gry/15 focus:border-wht duration-200 focus:shadow-xl focus:bg-wht rounded-full px-6 py-1.5 w-20 text-gray"
                required
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className=" bg-gry/10 bg-gradient-to-br from-gry/15 via-transparent to-gry/5 outline-none border border-transparent shadow-gry/15 focus:border-wht duration-200 focus:shadow-xl focus:bg-wht rounded-full px-6 py-1.5 text-gray"
              >
                <option value="days">Day{durationValue > 1 ? "s" : ""}</option>
                <option value="weeks">Week{durationValue > 1 ? "s" : ""}</option>
                <option value="months">Month{durationValue > 1 ? "s" : ""}</option>
              </select>
            </div>
            <button
              type="submit"
              className="gradient-btn hover:shadow-2xl shadow-2xl hover:shadow-purple-500/30 duration-300 hover:brightness-110 hover:shadow-3xl w-full flex text-lg items-center justify-center gap-2 bg-purple-500 text-white p-3 rounded-full"
              disabled={loading}
            >
              {loading ? "Generating" : "Generate Plan"}
              {loading ? (
                <Image alt="" src="/loader.svg" width={20} height={20} className="spinner" />
              ) : (
                <Image alt="" src="/sparkles.svg" width={20} height={20} className="" />
              )}
            </button>
          </form>

          {/* Loading Progress */}
          {loading && (
            <div className="mt-6 border border-purple-200 p-6 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Image alt="" src="/loader.svg" width={24} height={24} className="spinner" />
                <span className="text-purple-700 font-semibold text-lg">
                  {loadingMessage}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((loadingStage + 1) / PROGRESS_STAGES.length) * 100}%`,
                  }}
                />
              </div>
              
              <p className="text-sm text-purple-600 mt-3 text-center">
                This may take 1-2 minutes. Please wait...
              </p>
              
              {/* Stage Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {PROGRESS_STAGES.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx <= loadingStage ? "bg-purple-600 scale-125" : "bg-purple-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {generatedPlan.length ? (
            <div className="mt-6 border border-gry/15 p-4 bg-gray-50 rounded-xl text-gray">
              <div className="gradText uppercase text-xs">Schedule Generated</div>
              <h3 className="font-semibold text-2xl border-b border-gry/20  pb-4 mb-4 text-black">
                Preview Plan
              </h3>

              <div className="space-y-6">
                {generatedPlan?.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl p-6 shadow-xl shadow-gry/20 bg-gradient-to-br from-white to-transparent"
                  >
                    <h2 className="text-xl font-semibold mb-1">{item.range}</h2>
                    <h3 className="text-lg text-gray-700 mb-3">{item.topic}</h3>

                    <ul className="list-disc list-inside space-y-1">
                      {item.subtopics.map((sub, i) => (
                        <li key={i}>{sub.t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button
                onClick={saveGeneratedPlan}
                className="mt-3 flex items-center gap-2 justify-center w-full bg-blk hover:bg-blk/90 bg-gradient-to-br from-gry/40 duration-200 hover:shadow-xl hover:shadow-blk/20 text-white py-2 rounded-2xl cursor-pointer"
                disabled={savingSchedule}
              >
                {savingSchedule ? "Saving..." : "Save Schedule"}
                <Image
                  alt=""
                  src="/loader.svg"
                  width={20}
                  height={20}
                  className="spinner"
                  hidden={!savingSchedule}
                />
              </button>
            </div>
          ) : (
            ""
          )}
        </div>

        {/* User Schedules */}
        <div className="All-Schedules-Panel h-max lg:sticky top-4 w-full bg-white bg-gry/3--text-white rounded-3xl p-6">
          <div className="tab-header flex items-center gap-2 text-lg text-gry font-semibold mb-4">
            <p
              onClick={() => {
                setTabMode("schedules");
              }}
              className={` cursor-pointer flex items-center gap-2 ${
                tabMode == "schedules" ? "text-purple-500 bg-purple-300/30 " : " hover:bg-gry/10"
              } p-2 px-4 rounded-xl duration-200`}
            >
              <CalendarCheck size={16} />
              My Schedules
            </p>
            <p
              onClick={() => {
                setTabMode("quizzes");
              }}
              className={` cursor-pointer flex items-center gap-2 ${
                tabMode == "quizzes" ? "text-purple-500 bg-purple-300/30 " : " hover:bg-gry/10"
              } p-2 px-4 rounded-xl duration-200`}
            >
              <ListTodo size={16} />
              All Quizzes
            </p>
          </div>

      {tabMode == "schedules" ? (
  <>
    {userSchedules.length === 0 ? (
      <div className="text-center text-3xl flex gap-2 flex-col items-center py-8 text-gry">
        <Image src="/cactus.png" alt="cactus" width={140} height={140} />
        No schedules yet. Create your first plan!
      </div>
    ) : (
      <div className="space-y-4">
        {userSchedules.map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            onToggleReminders={toggleReminders}
            onDelete={deleteUserSchedule}
            onToggleSubtopicCompleted={toggleSubtopicCompleted}
            userId={userId}
            onRegenerateQuiz={regenerateQuiz}
          />
        ))}
        {loadingMore && (
  <div className="flex justify-center py-6 text-gray-500">
    <Image src="/loader.svg" width={25} height={25} alt="loading" className="spinner" />
    <span className="ml-2">Loading more schedules...</span>
  </div>
)}
      </div>
    )}
  </>
) : (
  <div>
    {!userQuizzes ? (
      <div className="text-center text-gray-500 py-8">Loading quiz history...</div>
    ) : userQuizzes.attempts?.length === 0 ? (
      <div className="text-center text-3xl flex flex-col items-center py-8 text-gry">
        <Image src="/cactus.png" alt="cactus" width={140} height={140} />
        No quiz attempts yet 📚
      </div>
    ) : (
      <div className="space-y-6">
        {/* Stats Overview */}
        {userQuizzes.stats && (
          <div className="p-4 rounded-xl bg-purple-100 text-purple-900 grid grid-cols-2 gap-4 text-center font-semibold">
            <p>Total Attempts: {userQuizzes.stats.totalAttempts}</p>
            <p>Completed: {userQuizzes.stats.completedAttempts}</p>
            <p>Average Score: {userQuizzes.stats.averageScore?.toFixed(1)}%</p>
            <p>Pass Rate: {userQuizzes.stats.passRate?.toFixed(1)}%</p>
          </div>
        )}

        {/* List Attempts */}
        {userQuizzes.attempts?.map((attempt: any, idx: number) => (
         <div
  key={attempt.id}
  className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow"
>
  <div className="flex justify-between items-start mb-2">
    <div>
      <h3 className="font-semibold text-xl text-gray-900">
        {attempt.quiz.title}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        Attempt #{idx + 1} • {new Date(attempt.startedAt).toLocaleDateString()}
      </p>
    </div>
    
    <div className="text-right">
      {attempt.completedAt ? (
        <span className="text-green-600 font-bold text-sm">✅ Completed</span>
      ) : (
        <span className="text-orange-600 font-bold text-sm">⏳ In Progress</span>
      )}
    </div>
  </div>

  {attempt.percentage !== undefined && attempt.completedAt && (
    <div className="mt-3 p-3 bg-purple-50 rounded-lg">
      <p className="text-gray-700 font-medium">
        Score: <span className="text-purple-700 font-bold">{attempt.score}/{attempt.totalQuestions}</span> ({attempt.percentage.toFixed(1)}%)
      </p>
      {attempt.timeTaken && (
        <p className="text-sm text-gray-600 mt-1">
          Time: {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
        </p>
      )}
    </div>
  )}

  {attempt.completedAt === null && (
    <button
      className="mt-3 w-full px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors"
      disabled={resumeLoader}
    onClick={async () => {
  console.log("▶️ Resume button clicked");
  console.log("attempt object:", attempt);
  console.log("attempt.id:", attempt?.id);

  if (!attempt) {
    console.error("❌ attempt is undefined!");
  }

  setResumeLoader(true);

  try {
    console.log(`🌐 Sending request to /quiz/attempts/${attempt?.id}/resume`);

    const res = await fetch(
      `http://localhost:5000/api/v1/quiz/attempts/${attempt?.id}/resume`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    console.log("📩 Response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ Backend returned non-OK:", errText);
      throw new Error("Failed to resume quiz");
    }

    const data = await res.json();
    console.log("📦 Raw response JSON:", data);

    console.log("🔍 data.quizAttempt:", data?.quizAttempt);
    console.log("🔍 data.quizAttempt.quizId:", data?.quizAttempt?.quizId);

    if (!data.quizAttempt) {
      console.error("❌ quizAttempt missing in response!");
    }

    if (!data.quizAttempt?.quizId) {
      console.error("❌ quizAttempt.quizId is undefined!");
    }

    // Set the quizId
    setSelectedQuizId(data.quizAttempt.quizId);
    console.log("✅ setSelectedQuizId called with:", data.quizAttempt.quizId);

    // Open the modal
    setShowQuizModal(true);
    console.log("📌 Modal opened");

  } catch (error) {
    console.error("❌ Resume failed:", error);
    setError("Failed to resume quiz");
  } finally {
    console.log("⏳ Resume action completed");
    setResumeLoader(false);
  }
}}

    >
      {resumeLoader ? "Loading..." : "📝 Resume Quiz"}
    </button>
  )}
</div>
        ))}
      </div>
    )}
  </div>
)}

{/* Quiz Modal - Move OUTSIDE the tab conditional */}
{showQuizModal && selectedQuizId && userId && (
  <QuizModal
    quizId={selectedQuizId}
    userId={userId}
    onClose={() => {
      setShowQuizModal(false);
      setSelectedQuizId(null);
      // Refresh quiz history after closing
      if (userId) {
        fetchUserQuizHistory().then(data => setUserQuizzes(data));
      }
    }}
  />
)}

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
        </div>
      </div>
    </main>
  );
}