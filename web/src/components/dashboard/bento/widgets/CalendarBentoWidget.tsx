"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { TaskDocument } from "@/lib/firestore";
import { useMounted } from "@/hooks/useMounted";

interface CalendarBentoWidgetProps {
  tasks: TaskDocument[];
}

export function CalendarBentoWidget({ tasks }: CalendarBentoWidgetProps) {
  const mounted = useMounted();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = mounted ? new Date() : currentDate;
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Extract task deadline dates for dots
  const taskDates = new Set(
    tasks
      .map((t) => (t.deadline?.toDate ? t.deadline.toDate() : null))
      .filter((d): d is Date => d !== null && d.getFullYear() === year && d.getMonth() === month)
      .map((d) => d.getDate())
  );

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div className="p-5 flex flex-col justify-between h-full group bg-white" suppressHydrationWarning>
      {/* Header Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900" suppressHydrationWarning>
              {monthNames[month]} {year}
            </h4>
            <p className="text-[10px] text-gray-400">Mini Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Calendar Grid */}
      <div className="my-auto py-1" suppressHydrationWarning>
        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-1">
          <span>Min</span>
          <span>Sen</span>
          <span>Sel</span>
          <span>Rab</span>
          <span>Kam</span>
          <span>Jum</span>
          <span>Sab</span>
        </div>

        {/* Days matrix */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {blankDays.map((_, i) => (
            <div key={`blank-${i}`} className="h-6" />
          ))}

          {daysArray.map((day) => {
            const isToday = isCurrentMonth && today.getDate() === day;
            const hasTask = taskDates.has(day);

            return (
              <div
                key={`day-${day}`}
                className="h-6 flex flex-col items-center justify-center relative group/day"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-all ${
                    isToday
                      ? "bg-primary text-white font-bold shadow-xs scale-105"
                      : "text-gray-700 hover:bg-primary-50 hover:text-primary"
                  }`}
                  suppressHydrationWarning
                >
                  {day}
                </span>
                {hasTask && !isToday && (
                  <span className="w-1 h-1 bg-amber-500 rounded-full absolute bottom-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1.5 border-t border-border/50">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" /> Deadline tugas
        </span>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-primary font-bold hover:underline cursor-pointer"
        >
          Hari Ini
        </button>
      </div>
    </div>
  );
}
