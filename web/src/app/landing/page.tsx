"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Brain, 
  Clock,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  Zap,
  Target,
  Users,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "How do I organize my notes and tasks?",
    answer: "MindFlow helps you organize notes by subject and automatically prioritizes tasks based on deadlines and difficulty. Your tasks are ranked so you always know what to work on next."
  },
  {
    question: "Can I use this with my study group?",
    answer: "Yes, you can share notes and task lists with classmates. MindFlow makes collaboration simple while keeping your personal workspace organized."
  },
  {
    question: "What about privacy - who sees my notes?",
    answer: "Only you can see your notes unless you explicitly share them. All data is encrypted and stored securely. We never sell or share your information."
  },
  {
    question: "How does the Pomodoro timer help?",
    answer: "The Pomodoro technique breaks study sessions into 25-minute focused blocks with 5-minute breaks. This keeps you fresh and prevents burnout while maintaining productivity."
  },
  {
    question: "Is there a free version?",
    answer: "Yes, MindFlow is completely free for students. No hidden fees, no credit card required. Just sign up and start organizing your study life."
  }
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pomoTime, setPomoTime] = useState(1500);
  const [pomoRunning, setPomoRunning] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomoRunning && pomoTime > 0) {
      interval = setInterval(() => setPomoTime((prev) => prev - 1), 1000);
    } else if (pomoTime === 0) {
      setPomoRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomoRunning, pomoTime]);

  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGetStarted = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden">
      
      {/* NAVBAR */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#2D6A4F] flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-[#1B4D3E]">MindFlow</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <motion.a href="#features" whileHover={{ color: "#1B4D3E" }} className="text-gray-600 hover:text-[#1B4D3E] transition-colors">Features</motion.a>
            <motion.a href="#how" whileHover={{ color: "#1B4D3E" }} className="text-gray-600 hover:text-[#1B4D3E] transition-colors">How It Works</motion.a>
            <motion.a href="#faq" whileHover={{ color: "#1B4D3E" }} className="text-gray-600 hover:text-[#1B4D3E] transition-colors">FAQ</motion.a>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGetStarted}
            className="font-semibold"
          >
            Get Started
          </Button>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 bg-gradient-to-b from-white via-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left side */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block"
                >
                  <span className="text-sm font-semibold text-[#2D6A4F] bg-[#8BBF9F]/10 px-4 py-2 rounded-full">For Every Student</span>
                </motion.div>

                <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 leading-tight">
                  Get stuff <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B4D3E] to-[#2D6A4F]">done</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                  Organize notes, track tasks, stay focused. Everything a student needs in one clean, simple app.
                </p>
              </div>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={handleGetStarted}
                  variant="primary"
                  size="lg"
                  className="px-8 font-semibold text-base shadow-lg hover:shadow-xl transition-shadow"
                >
                  Start Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 font-semibold text-base"
                >
                  See Demo
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div 
                className="grid grid-cols-2 gap-6 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {[
                  { stat: "100%", label: "Free" },
                  { stat: "2min", label: "Setup" }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-2xl font-bold text-[#1B4D3E]">{item.stat}</p>
                    <p className="text-sm text-gray-600">{item.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right side - Visual demo */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              {/* Floating cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-8 -left-4 w-56 bg-white rounded-2xl p-6 shadow-xl border border-gray-100 z-20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full bg-[#2D6A4F]" />
                  <span className="text-xs font-semibold text-gray-500 uppercase">Today</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-5/6" />
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                className="absolute top-32 -right-8 w-64 bg-gradient-to-br from-[#1B4D3E]/5 to-[#2D6A4F]/5 rounded-2xl p-6 border border-[#8BBF9F]/20 z-10"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2D6A4F]" />
                    <span className="text-sm font-semibold text-gray-700">Focus Time</span>
                  </div>
                  <div className="text-3xl font-bold text-[#1B4D3E]">25:00</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute bottom-0 left-1/4 w-52 bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
              >
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-2 rounded-full ${i === 1 ? 'w-8 bg-[#2D6A4F]' : 'w-2 bg-gray-300'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-500">3 tasks ready</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Made for how you study</h2>
            <p className="text-lg text-gray-600">Simple, powerful tools that actually fit your life</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Smart Notes",
                desc: "Organize by subject, search instantly. Keep everything in one place without clutter.",
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: Target,
                title: "Task Priority",
                desc: "Always know what's urgent. Never miss a deadline or get overwhelmed again.",
                color: "from-amber-500 to-amber-600"
              },
              {
                icon: Zap,
                title: "Stay Focused",
                desc: "Built-in Pomodoro timer. Study in bursts, rest properly, stay productive.",
                color: "from-emerald-500 to-emerald-600"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1B4D3E]/5 to-[#2D6A4F]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-8 rounded-2xl border border-gray-100 group-hover:border-[#8BBF9F] transition-colors">
                  <motion.div 
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <item.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Three simple steps</h2>
            <p className="text-lg text-gray-600">Get started in minutes</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { num: "01", title: "Sign up free", desc: "No credit card. Create your account in 2 minutes." },
              { num: "02", title: "Add your stuff", desc: "Write notes, create tasks, set deadlines." },
              { num: "03", title: "Get organized", desc: "Focus on what matters. Use Pomodoro. Succeed." }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="relative"
              >
                {/* Connector line */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-1 bg-gradient-to-r from-[#8BBF9F] to-[#8BBF9F]/20 -z-10" />
                )}

                <div className="relative">
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B4D3E] to-[#2D6A4F] text-white flex items-center justify-center font-bold text-xl mb-6 mx-auto shadow-lg"
                    whileHover={{ scale: 1.15, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {item.num}
                  </motion.div>

                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* POMODORO DEMO */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Study smarter</h2>
            <p className="text-gray-600">Try our built-in Pomodoro timer</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-[#1B4D3E]/5 to-[#2D6A4F]/5 rounded-3xl p-12 border border-[#8BBF9F]/20 backdrop-blur-sm"
          >
            <div className="text-7xl font-mono font-bold text-[#1B4D3E] mb-8 text-center font-extrabold">
              {formatPomoTime(pomoTime)}
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                variant={pomoRunning ? "outline" : "primary"}
                onClick={() => setPomoRunning(!pomoRunning)}
                size="lg"
                className="font-semibold"
              >
                {pomoRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {pomoRunning ? "Pause" : "Start"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setPomoTime(1500); setPomoRunning(false); }}
                size="lg"
                className="font-semibold"
              >
                <RotateCcw className="w-5 h-5" /> Reset
              </Button>
            </div>

            <p className="text-sm text-gray-600 text-center mt-6">25 minutes focused, 5 minutes break</p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <motion.h2 
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Frequently Asked
          </motion.h2>

          <div className="space-y-3">
            {FAQ_DATA.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-[#8BBF9F] transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-6 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-900">{faq.question}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                      <ChevronDown className="w-5 h-5 text-[#2D6A4F]" />
                    </motion.div>
                  </button>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: isOpen ? 1 : 0, height: isOpen ? "auto" : 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-gray-600 border-t border-gray-100 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-[#1B4D3E] via-[#2D6A4F] to-[#1B4D3E] text-white relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-0 right-0 w-96 h-96 bg-[#8BBF9F]/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <motion.h2 
            className="text-3xl sm:text-5xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Ready to get stuff done?
          </motion.h2>
          <motion.p 
            className="text-lg text-white/80"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Join thousands of students already using MindFlow. Free forever.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleGetStarted}
              variant="primary"
              size="lg"
              className="bg-white text-[#1B4D3E] hover:bg-gray-100 font-semibold text-lg px-10 shadow-xl"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Trusted by students worldwide</h2>
            <p className="text-lg text-gray-600">Growing every day</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { stat: "50K+", label: "Active Students" },
              { stat: "2M+", label: "Tasks Completed" },
              { stat: "100%", label: "Free Forever" },
              { stat: "24/7", label: "Support Available" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100 text-center"
              >
                <p className="text-4xl sm:text-5xl font-bold text-[#1B4D3E] mb-2">{item.stat}</p>
                <p className="text-gray-600">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Why students love MindFlow</h2>
            <p className="text-lg text-gray-600">Real benefits for real studying</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Save Hours Every Week",
                desc: "Stop searching through notebooks and scattered notes. Find what you need in seconds.",
                icon: Clock
              },
              {
                title: "Never Miss a Deadline",
                desc: "Automatic task prioritization keeps you focused on what's urgent right now.",
                icon: Target
              },
              {
                title: "Study Like a Pro",
                desc: "Pomodoro timer built-in. Proven technique to study effectively without burnout.",
                icon: Zap
              },
              {
                title: "Collaborate Easily",
                desc: "Share notes with study groups. Keep everyone on the same page.",
                icon: Users
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex gap-6 p-8 bg-white rounded-2xl border border-gray-100 hover:border-[#8BBF9F] transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-[#1B4D3E]/10 text-[#1B4D3E] flex items-center justify-center">
                    <item.icon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">What students say</h2>
            <p className="text-lg text-gray-600">See why they switched</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Finally organized my messy notes. My GPA went up 0.5 points just from staying on top of everything.",
                author: "Sarah M.",
                role: "Pre-Med Student"
              },
              {
                quote: "The Pomodoro timer is a game changer. I actually focus now instead of scrolling for hours.",
                author: "Alex K.",
                role: "Engineering Major"
              },
              {
                quote: "Sharing notes with my study group became so easy. We're all using it now.",
                author: "Jordan P.",
                role: "Business School"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className="text-amber-400">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{item.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{item.author}</p>
                  <p className="text-sm text-gray-600">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES DEEP DIVE */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Every feature you need</h2>
            <p className="text-lg text-gray-600">And nothing you don't</p>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                title: "Rich Note Editor",
                desc: "Write with formatting. Add links, images, and code snippets. Search across all notes instantly.",
                image: "📝",
                align: "left"
              },
              {
                title: "Smart Task Management",
                desc: "Create tasks with deadlines. MindFlow automatically prioritizes by urgency. Never feel overwhelmed.",
                image: "✓",
                align: "right"
              },
              {
                title: "Built-in Pomodoro Timer",
                desc: "Study in focused 25-minute blocks. Take 5-minute breaks. Track your study sessions over time.",
                image: "⏱",
                align: "left"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="grid md:grid-cols-2 gap-12 items-center"
              >
                {feature.align === "left" ? (
                  <>
                    <div className="text-6xl text-center md:text-right text-[#1B4D3E]">{feature.image}</div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                      <p className="text-lg text-gray-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                      <p className="text-lg text-gray-600 leading-relaxed">{feature.desc}</p>
                    </div>
                    <div className="text-6xl text-center text-[#1B4D3E]">{feature.image}</div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Simple pricing</h2>
            <p className="text-lg text-gray-600">One plan. Forever free.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto bg-gradient-to-br from-[#1B4D3E] to-[#2D6A4F] text-white p-12 rounded-3xl"
          >
            <h3 className="text-3xl font-bold mb-2">Student Plan</h3>
            <p className="text-white/80 mb-8">Everything you need to succeed</p>

            <div className="mb-8">
              <div className="text-5xl font-bold mb-2">$0</div>
              <p className="text-white/80">Forever free. No credit card required.</p>
            </div>

            <div className="space-y-4 mb-8">
              {[
                "Unlimited notes",
                "Unlimited tasks",
                "Pomodoro timer",
                "Note sharing",
                "24/7 email support"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#8BBF9F]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGetStarted}
              variant="primary"
              size="lg"
              className="w-full bg-white text-[#1B4D3E] hover:bg-gray-100 font-semibold"
            >
              Get Started Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 px-4 sm:px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#1B4D3E] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">MindFlow</span>
              </div>
              <p className="text-sm">Study smarter, not harder.</p>
            </div>

            {[
              { title: "Product", links: ["Features", "Pricing", "Download"] },
              { title: "Company", links: ["About", "Blog", "Careers"] },
              { title: "Legal", links: ["Privacy", "Terms", "Contact"] }
            ].map((col, idx) => (
              <div key={idx}>
                <p className="font-semibold text-white mb-4">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-700 pt-8 flex items-center justify-between text-sm">
            <p>© 2026 MindFlow. All rights reserved.</p>
            <p>Made for students 🎓</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
