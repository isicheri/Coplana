"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Props = {};

type Subtopic = { id: string; title: string; completed: boolean };
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

const page = (props: Props) => {
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userSchedules, setUserSchedules] = useState<ScheduleType[]>([]);

  const [username, setUsername] = useState("");

  //Auto-login
  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedEmail = localStorage.getItem("email");
    const savedUsername = localStorage.getItem("username");
    if (savedUserId && savedEmail && savedUsername) {
      setUserId(savedUserId);
      setEmail(savedEmail);
      setUsername(savedUsername);
      window.location.href = "/dashboard";
    }
  }, []);

  async function fetchUserSchedules() {
    if (!email || !username) return;

    try {
      const res = await fetch("/api/schedules/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch schedules");
      setUserSchedules(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
    }
  }

  /* ------------------- Auth ------------------- */
  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setUserId(data.user.id);
      window.location.href = "/dashboard";

      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("email", email);
      localStorage.setItem("username", username);
    } catch (err: any) {
      setError(err.message);
      console.error("SIGNUP ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loginUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setUserId(data.user.id);
      setUsername(data.user.username);
      setEmail(data.user.email);
      window.location.href = "/dashboard";
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("username", data.user.username);
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <main className="min-h-screen  bg-gradient-to-br from-purple-500 to-blue-700 flex flex-col gap-2 items-center justify-center">
        <div className="bubbles w-full h-full bg-cover bg-no-repeat mix-blend-screen bg-center fixed top-0 left-0 "></div>
        <motion.div
          style={{
            overflow: "hidden",
            backgroundImage: `url("/grid.svg")`,
            backgroundSize: 200,
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 * 0.2 }}
          viewport={{ once: true }}
          className="bg-white/30 text-white flex items-center gap-4 text-2xl noisy backdrop-blur rotate-3 w-full p-4 rounded-4xl max-w-md -mt-16 opacity-50 blur-[4px] scale-75"
        >
          <div className="w-16 bg-wht h-16 rounded-full flex items-center justify-center">
            <Image
              src="/bell-3d.svg"
              width={40}
              height={40}
              alt=""
              className="shrink-0"
            />
          </div>
          It's time for the next chapter!
        </motion.div>
        <motion.div
          style={{
            overflow: "hidden",
            backgroundImage: `url("/grid.svg")`,
            backgroundSize: 200,
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 * 0.2 }}
          viewport={{ once: true }}
          className="bg-white/30 text-white flex items-center gap-4 text-2xl noisy backdrop-blur blur-[2px] w-full -rotate-2 p-4 rounded-4xl max-w-md -mt-16  scale-90"
        >
          <div className="w-16 bg-wht h-16 rounded-full flex items-center justify-center">
            <Image
              src="/quiz.svg"
              width={40}
              height={40}
              alt=""
              className="shrink-0"
            />
          </div>
          Quiz Generated for Week 1!
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.5 * 0.2 }}
          viewport={{ once: true }}
          className="bg-wht/20 noisy bg-gradient-to-br to-wht/40 from-wht backdrop-blur rounded-4xl shadow-2xl p-8 max-w-md w-full -mt-12 z-[20] mx-4"
        >
          <div className="text-center flex flex-col items-center gap-2 mb-8">
            <Link href="/">
              <Image
                src="/logo-gradient.svg"
                width={140}
                height={40}
                alt="coplana"
                className="text-purple-500 text-2xl font-black "
              />
            </Link>
            <p className="text-gray">Create your personalized study schedule</p>
          </div>

          <div className="tabs-slider-pad unsel flex bg-gray-100/20 relative rounded-full p-2 mb-6">
            <div
              style={authMode === "signup" ? { left: "0" } : { left: "50%" }}
              className="tabSlider scale-x-90 shadow-xl shadow-gry/10 scale-y-75 duration-300 w-1/2 h-full bg-gradient-to-br from-white/80 to-transparent z-0 absolute top-0 left-1/2 rounded-full"
            ></div>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`relative z-[1] flex-1 py-2 px-4 rounded-lg font-medium ${
                authMode === "signup"
                  ? "text-blk scale-110"
                  : "text-gray-600 hover:text-gray"
              } duration-200`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`relative z-[1] flex-1 py-2 px-4 rounded-lg font-medium ${
                authMode === "login"
                  ? "text-blk scale-110"
                  : "text-gray-600 hover:text-gray"
              } duration-200`}
            >
              Login
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-yellow-400/15 px-6 rounded-full text-yellow-700 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={authMode === "signup" ? createUser : loginUser}
            className="space-y-4"
          >
            <input
              className="w-full bg-wht/15 rounded-full p-3 px-6 outline-none bg-gradient-to-br from-transparent focus:border-wht focus:shadow-2xl focus:shadow-gry/20 text-gray"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full bg-wht/15 rounded-full p-3 px-6 outline-none bg-gradient-to-br from-transparent focus:border-wht focus:shadow-2xl focus:shadow-gry/20 text-gray"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <button
              className="gradient-btn duration-300 hover:brightness-110 hover:shadow-3xl hover:shadow-[#9c9c9c]/20 w-full flex text-lg items-center justify-center gap-2 bg-purple-500 text-white p-3 rounded-full"
              disabled={loading}
              type="submit"
            >
              {loading
                ? "Hold on..."
                : authMode === "signup"
                ? "Get Started"
                : "Sign in"}
            </button>
          </form>
        </motion.div>
      </main>
    </>
  );
};

export default page;
