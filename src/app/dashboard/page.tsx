"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BookOpen, Brain, Target, TrendingUp, Clock, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

const stats = [
  { icon: BookOpen, label: "Study Streak", value: "—", unit: "days", color: "bg-blue-50 text-blue-600" },
  { icon: Target, label: "Goal Progress", value: "—", unit: "%", color: "bg-purple-50 text-purple-600" },
  { icon: TrendingUp, label: "Performance Score", value: "—", unit: "pts", color: "bg-primary/10 text-primary" },
  { icon: Activity, label: "Wellness Index", value: "—", unit: "/ 10", color: "bg-orange-50 text-orange-600" },
];

const upcoming = [
  { icon: Brain, title: "AI Insight Report", desc: "Your personalized academic analysis is being generated", tag: "Coming Soon" },
  { icon: Clock, title: "Smart Study Planner", desc: "AI-optimized study schedule based on your habits", tag: "Phase 2" },
  { icon: Target, title: "Goal Tracker", desc: "Set, monitor, and crush your academic targets", tag: "Phase 2" },
];

export default function DashboardPage() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
      </div>
    );
  }

  const firstName = userDoc?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Student";

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="font-bold text-primary text-lg">MindFlow AI</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                {firstName[0]}
              </div>
              <span className="text-sm font-medium text-[#1F2937] hidden sm:block">
                {userDoc?.name || user?.displayName}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              id="dashboard-signout"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">👋</span>
            <div>
              <h1 className="text-3xl font-bold text-[#1F2937]">
                Welcome, {firstName}!
              </h1>
              <p className="text-gray-500 text-base mt-0.5">
                Your academic command center is almost ready.
              </p>
            </div>
          </div>
        </div>

        {/* Assessment complete banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 flex items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl shrink-0">
            ✅
          </div>
          <div>
            <h3 className="font-semibold text-[#1F2937]">Assessment Complete</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Your Academic Insight profile has been created. Our AI is analyzing your data to generate personalized recommendations.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-lg font-semibold text-[#1F2937] mb-4">Your Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="p-5 bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-[#1F2937]">
                  {stat.value}
                  <span className="text-sm font-normal text-gray-400 ml-1">{stat.unit}</span>
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming features */}
        <div>
          <h2 className="text-lg font-semibold text-[#1F2937] mb-4">Coming Next</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {upcoming.map((item, i) => (
              <div
                key={i}
                className="p-5 bg-white rounded-2xl border border-border shadow-card hover:border-primary/30 hover:shadow-card-hover transition-all duration-200 animate-slide-up cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[#1F2937] text-sm">{item.title}</h3>
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
