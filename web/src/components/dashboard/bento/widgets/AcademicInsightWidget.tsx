"use client";

import React from "react";
import Link from "next/link";
import { Brain, ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { AcademicInsight } from "@/lib/firestore";

interface AcademicInsightWidgetProps {
  insight: AcademicInsight | null;
}

export function AcademicInsightWidget({ insight }: AcademicInsightWidgetProps) {
  const hasAssessment = !!insight;
  const score = insight?.academicScore || 0;
  const prediction = insight?.prediction || "Not Assessed";

  return (
    <div className="p-5 flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Academic Insight</h4>
            <p className="text-[10px] text-gray-400">ML Performance Evaluation</p>
          </div>
        </div>
        <Link
          href="/insight"
          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
          title="Open Academic Insight"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-4 items-center my-auto py-2">
        {hasAssessment ? (
          <>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {score}
                </span>
                <span className="text-xs text-gray-400 font-bold">/ 100</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full w-fit">
                <Sparkles className="w-3 h-3" />
                <span>{prediction} Standing</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-2xl border border-border/50 line-clamp-2">
              {insight.strengths?.[0] ? (
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{insight.strengths[0]}</span>
                </div>
              ) : (
                "Assessment active & synced"
              )}
            </div>
          </>
        ) : (
          <div className="col-span-2 text-center py-2 space-y-1">
            <p className="text-xs font-bold text-gray-700">Take Assessment</p>
            <p className="text-[10px] text-gray-400">
              Run ML model on your study habits to get personalized insights
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-border/50">
        <span>{hasAssessment ? "Updated via ML Model" : "No data yet"}</span>
        <Link
          href={hasAssessment ? "/insight" : "/assessment"}
          className="text-purple-600 font-bold hover:underline"
        >
          {hasAssessment ? "Full Report →" : "Start Now →"}
        </Link>
      </div>
    </div>
  );
}
