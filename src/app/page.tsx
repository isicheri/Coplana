"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Boxes from "../app/components/Boxes"


export default function CoplanaLanding() {
  return (
    <>
      {/* <div className="w-full h-40 bg-white"></div> */}
      {/* <div className=" bg-red-50 w-full h-screen -z-[20]"> */}
        <Boxes />
      {/* </div> */}
      <div className="min-h-screen relative dotted|bg-white|bg-gradient-to-b|from-white|to-gray-100 text-blk flex flex-col">
        {/* Hero Section */}

        <div className="header sticky top-0 z-[20] shadow-2xl shadow-black/60 bg-blk p-4 md:px-8 lg:px-16 flex items-center gap-4 justify-between">
          <Image src="/logo.svg" width={140} height={40} alt="logo" />
          <div className="end flex items-center ">
            <Link href="/onboarding">
              <div className="gradText  p-3 border-white/15 font-semibold text-sm text-white px-5 hover:underline border-r">
                PREMIUM FEATURES
              </div>
            </Link>
            <Link href="/onboarding">
              <div className="login  p-3 text-white px-5 hover:underline ">
                CONTINUE FOR FREE &rarr;
              </div>
            </Link>
          </div>
        </div>

        <header className="flex flex-col px-6 md:px-8 lg:px-16 py-24">
          <div className="gradText w-max mb-4 font-semibold">
            BIG TOPICS, LITTLE TIMEFRAME.
          </div>
          <motion.h1
            className="text-7xl hero-title py-4 lg:text-8xl font-semibold leading-[4.5rem] mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ letterSpacing: -3 }}
          >
            No more messy plans. <br />
            You've got{" "}
            <span style={{ letterSpacing: -3 }} className="gradText">
              Coplana
            </span>
            .
          </motion.h1>
          <motion.p
            className="text-2xl mt-4 max-w-2xl mb-8 text-gry "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Give Coplana your topics and deadlines. It designs a plan that keeps
            you on track without burning you out.
          </motion.p>

          <Link href="/onboarding">
            <motion.button
              className="cursor-pointer gradient-btn bg-purple-500 rounded-full text-2xl text-white font-semibold px-10 py-5 shadow-xl hover:brightness-110 transition-all duration-300"
              whileHover={{ translateY: -8 }}
            >
              Get Started &rarr;
            </motion.button>
          </Link>
        </header>
        <div className="w-full flex justify-end -mt-20 md:-mt-[8rem] lg:-mt-[12rem]">
          <Image
            src="/ui-comp.svg"
            width={300}
            height={300}
            alt=""
            className=" w-[80%]"
          />
        </div>

        {/* Feature Highlights */}
        <div
          style={{ backgroundImage: "linear-gradient(transparent, #f9f9f9)" }}
          className="fader-top w-full h-[160px] -mt-[160px] "
        ></div>
        <section className="px-6 py-16 bg-wht">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-16">
            Why You'll Love Coplana
          </h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto md:hover:*:not-hover:blur-lg md:hover:*:not-hover:scale-90 ">
            {[
              {
                title: "AI-Powered Study Scheduling",
                desc: "Input your topic and available timeframe. Coplana creates a personalized study breakdown tailored to your pace and depth.",
                icon: "ai",
              },
              {
                title: "Save & Manage Your Plans",
                desc: "All your study plans stay organized. Easily view, edit, and track your progress. one dashboard, all your goals.",
                icon: "books",
              },
              {
                title: "Stay Consistent with Reminders",
                desc: "Enable smart reminders that nudge you to study, recap, or take quizzes, so motivation never fades.",
                icon: "alarm",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                style={{
                  overflow: "hidden",
                  backgroundImage: `url("/grid.svg")`,
                  backgroundSize: 200,
                }}
                className="featureCard p-6 border border-wht hover:scale-[1.02] duration-1000 relative bg-blk bg-gradient-to-br from-black to-blk text-white rounded-[3rem] transition-all"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{boxShadow: "#4b91f365 0px 20px 30px"}}
              >
                <div className="glow w-[120px] h-[120px] duration-500 bg-blue-500 border-8 border-cyan-300 blur-2xl rounded-full absolute -top-8 -left-8"></div>
                <Image
                  src={`/${feature.icon}.svg`}
                  width={45}
                  height={45}
                  alt={feature.icon}
                  className="relative"
                />
                <h3 className="text-3xl relative pt-26  font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-gry relative">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <div
          style={{ backgroundImage: "linear-gradient(#f9f9f9, transparent)" }}
          className="fader-bottom w-full h-[160px] -[160px] "
        ></div>

        {/* Coming Soon Section */}
        <div className="w-full p-4 md:p-8">
          <section className="cta bg-cover rounded-4xl bg-no-repeat bg-center text-wht bg-[#2a243b] bg-blend-overlay px-6 py-20 text-center">
            <div className="w-full text-center flex justify-center">
              {" "}
              <div className="gradText w-max">COPLANA BETA</div>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              And that's just the beginning...
            </h2>
            <p className="max-w-2xl mx-auto text-gry text-lg mb-8">
              Soon, Coplana will do more than plan. It'll test your readiness
              with auto-generated quizzes and insights, helping you identify
              your strong and weak areas before the big day.
            </p>
            <motion.button
              className="bg-wht hover:bg-wht/70 text-blk text-lg font-semibold px-8 py-3 rounded-full cursor-pointer shadow-md transition-all duration-200"
              whileHover={{ scale: 1.05 }}
            >
              Join the Waitlist
            </motion.button>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-auto bg-#f9f9f9 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Coplana. Crafted to help YOU study
          smarter.
        </footer>
      </div>
    </>
  );
}
