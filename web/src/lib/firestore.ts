import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ── User Document ─────────────────────────────────────────────────────────────

export interface UserDocument {
  uid: string;
  name: string;
  email: string;
  assessmentCompleted: boolean;
  avatarUrl?: string;
  major?: string;
  university?: string;
  role?: "admin" | "user";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function createUserDocument(
  uid: string,
  data: Omit<UserDocument, "createdAt">
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserDocument(
  uid: string,
  data: Partial<UserDocument>
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUserDocument(
  uid: string
): Promise<UserDocument | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as UserDocument;
}

export async function markAssessmentComplete(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { assessmentCompleted: true, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Academic Assessment ───────────────────────────────────────────────────────

export interface AcademicAssessmentData {
  userId: string;
  age: number;
  gender: number;
  study_hours_per_day: number;
  social_media_hours: number;
  netflix_hours: number;
  part_time_job: number;
  attendance_percentage: number;
  sleep_hours: number;
  diet_quality: number;
  exercise_frequency: number;
  parental_education_level: number;
  internet_quality: number;
  mental_health_rating: number;
  extracurricular_participation: number;
  createdAt?: unknown;
}

export async function saveAssessment(
  userId: string,
  data: Omit<AcademicAssessmentData, "userId" | "createdAt">
): Promise<void> {
  const assessmentRef = doc(db, "academic_assessments", userId);
  await setDoc(assessmentRef, {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  });
}

export async function getAssessment(
  userId: string
): Promise<AcademicAssessmentData | null> {
  const assessmentRef = doc(db, "academic_assessments", userId);
  const snap = await getDoc(assessmentRef);
  if (!snap.exists()) return null;
  return snap.data() as AcademicAssessmentData;
}

// ── Academic Insight ──────────────────────────────────────────────────────────

export interface AcademicInsight {
  userId: string;
  academicScore: number;
  prediction: string;
  confidence: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  generatedAt?: unknown;
}

export async function saveAcademicInsight(
  userId: string,
  data: Omit<AcademicInsight, "userId" | "generatedAt">
): Promise<void> {
  const insightRef = doc(db, "academic_insights", userId);
  await setDoc(insightRef, {
    ...data,
    userId,
    generatedAt: serverTimestamp(),
  });
}

export async function getAcademicInsight(
  userId: string
): Promise<AcademicInsight | null> {
  const insightRef = doc(db, "academic_insights", userId);
  const snap = await getDoc(insightRef);
  if (!snap.exists()) return null;
  return snap.data() as AcademicInsight;
}

// ── Notes ───────────────────────────────────────────────────────────────────

export interface NoteAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface NoteDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  trashedAt?: unknown;
  attachments?: NoteAttachment[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function createNote(
  userId: string,
  title: string,
  content: string,
  tags: string[],
  isPinned: boolean = false,
  isArchived: boolean = false,
  isTrashed: boolean = false,
  attachments: NoteAttachment[] = []
): Promise<string> {
  const noteRef = doc(collection(db, "notes"));
  const noteId = noteRef.id;
  await setDoc(noteRef, {
    id: noteId,
    userId,
    title,
    content,
    tags,
    isPinned,
    isArchived,
    isTrashed,
    trashedAt: isTrashed ? serverTimestamp() : null,
    attachments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return noteId;
}

export async function updateNote(
  noteId: string,
  data: Partial<Omit<NoteDocument, "id" | "userId" | "createdAt">>
): Promise<void> {
  const noteRef = doc(db, "notes", noteId);
  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Set or clear trashedAt timestamp
  if (data.isTrashed === true && data.trashedAt === undefined) {
    payload.trashedAt = serverTimestamp();
  } else if (data.isTrashed === false) {
    payload.trashedAt = null;
  }

  await updateDoc(noteRef, payload);
}

export async function duplicateNote(note: NoteDocument): Promise<string> {
  const noteRef = doc(collection(db, "notes"));
  const noteId = noteRef.id;
  
  // Extract fields and exclude timestamps to avoid Firestore type mismatch
  const rest = { ...note } as Partial<NoteDocument>;
  delete rest.id;
  delete rest.createdAt;
  delete rest.updatedAt;
  delete rest.trashedAt;
  
  await setDoc(noteRef, {
    ...rest,
    id: noteId,
    title: `${note.title} (Copy)`,
    isPinned: false,
    isTrashed: false,
    trashedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return noteId;
}

export async function deleteNote(noteId: string): Promise<void> {
  const noteRef = doc(db, "notes", noteId);
  await deleteDoc(noteRef);
}

export async function getNote(noteId: string): Promise<NoteDocument | null> {
  const noteRef = doc(db, "notes", noteId);
  const snap = await getDoc(noteRef);
  if (!snap.exists()) return null;
  return snap.data() as NoteDocument;
}

// 3 Days in milliseconds
const TRASH_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export async function getUserNotes(userId: string): Promise<NoteDocument[]> {
  const q = query(
    collection(db, "notes"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const notes: NoteDocument[] = [];
  const now = Date.now();
  const expiredNoteIds: string[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as NoteDocument;
    
    // Check if trashed note is older than 3 days
    if (data.isTrashed) {
      let trashedTime = 0;
      if (data.trashedAt && typeof (data.trashedAt as { seconds?: number }).seconds === "number") {
        trashedTime = (data.trashedAt as { seconds: number }).seconds * 1000;
      } else if (data.updatedAt && typeof (data.updatedAt as { seconds?: number }).seconds === "number") {
        trashedTime = (data.updatedAt as { seconds: number }).seconds * 1000;
      }

      if (trashedTime > 0 && now - trashedTime >= TRASH_RETENTION_MS) {
        // Expired after 3 days -> auto purge permanently
        expiredNoteIds.push(data.id);
        return;
      }
    }

    notes.push(data);
  });

  // Permanently delete expired trashed notes in background
  if (expiredNoteIds.length > 0) {
    Promise.all(expiredNoteIds.map((id) => deleteDoc(doc(db, "notes", id)))).catch(() => {});
  }

  // Sort client side by updatedAt desc
  notes.sort((a, b) => {
    const timeA = a.updatedAt ? (a.updatedAt as { seconds?: number }).seconds || 0 : 0;
    const timeB = b.updatedAt ? (b.updatedAt as { seconds?: number }).seconds || 0 : 0;
    return timeB - timeA;
  });
  return notes;
}

// ── Note Summaries ──────────────────────────────────────────────────────────

export interface NoteSummary {
  id: string;
  noteId: string;
  userId: string;
  summary: string;
  generatedAt?: unknown;
}

export async function saveNoteSummary(
  noteId: string,
  userId: string,
  summary: string
): Promise<void> {
  const summaryRef = doc(db, "note_summaries", noteId);
  await setDoc(summaryRef, {
    id: noteId,
    noteId,
    userId,
    summary,
    generatedAt: serverTimestamp(),
  });
}

export async function getNoteSummary(noteId: string): Promise<NoteSummary | null> {
  const summaryRef = doc(db, "note_summaries", noteId);
  const snap = await getDoc(summaryRef);
  if (!snap.exists()) return null;
  return snap.data() as NoteSummary;
}

export async function getUserSummariesCount(userId: string): Promise<number> {
  const q = query(
    collection(db, "note_summaries"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.size;
}

// ── Chat History ─────────────────────────────────────────────────────────────

export interface ChatHistory {
  id: string;
  userId: string;
  noteId: string;
  question: string;
  answer: string;
  createdAt?: unknown;
}

export async function saveChatHistory(
  userId: string,
  noteId: string,
  question: string,
  answer: string
): Promise<string> {
  const chatRef = doc(collection(db, "chat_history"));
  const chatId = chatRef.id;
  await setDoc(chatRef, {
    id: chatId,
    userId,
    noteId,
    question,
    answer,
    createdAt: serverTimestamp(),
  });
  return chatId;
}

export async function getUserChatHistory(
  userId: string,
  limitCount: number = 20
): Promise<ChatHistory[]> {
  const q = query(
    collection(db, "chat_history"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const chatList: ChatHistory[] = [];
  snap.forEach((docSnap) => {
    chatList.push(docSnap.data() as ChatHistory);
  });
  // Sort client side by createdAt desc
  chatList.sort((a, b) => {
    const timeA = a.createdAt ? (a.createdAt as { seconds?: number }).seconds || 0 : 0;
    const timeB = b.createdAt ? (b.createdAt as { seconds?: number }).seconds || 0 : 0;
    return timeB - timeA;
  });
  return chatList.slice(0, limitCount);
}

export async function deleteChatHistory(chatId: string): Promise<void> {
  const chatRef = doc(db, "chat_history", chatId);
  await deleteDoc(chatRef);
}

export async function clearAllUserChatHistory(userId: string): Promise<void> {
  const q = query(
    collection(db, "chat_history"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskDocument {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: Timestamp;
  importance: number;
  difficulty: number;
  progress: number;
  /** Academic risk score (0–100) used as a fuzzy logic input. */
  academicRisk: number;
  priorityScore: number;
  priorityLevel: string;
  riskLevel: string;
  estimatedTotalMinutes: number;
  /** Human-readable reasoning produced by the fuzzy engine. */
  reasoning: string;
  course?: string;
  workspace?: string;
  status: "todo" | "doing" | "done";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function createTask(
  userId: string,
  data: Omit<TaskDocument, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const taskRef = doc(collection(db, "tasks"));
  const taskId = taskRef.id;
  await setDoc(taskRef, {
    ...data,
    id: taskId,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return taskId;
}

export async function updateTask(
  taskId: string,
  fields: Partial<Omit<TaskDocument, "id" | "userId" | "createdAt">>
): Promise<void> {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteTask(taskId: string): Promise<void> {
  const taskRef = doc(db, "tasks", taskId);
  await deleteDoc(taskRef);
}

export async function getTask(taskId: string): Promise<TaskDocument | null> {
  const taskRef = doc(db, "tasks", taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    estimatedTotalMinutes: data.estimatedTotalMinutes ?? data.estimatedFocusMinutes ?? 0,
  } as TaskDocument;
}

export async function getUserTasks(userId: string): Promise<TaskDocument[]> {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const tasks: TaskDocument[] = [];
  snap.forEach((d) => {
    const data = d.data();
    tasks.push({
      ...data,
      estimatedTotalMinutes: data.estimatedTotalMinutes ?? data.estimatedFocusMinutes ?? 0,
    } as TaskDocument);
  });
  tasks.sort((a, b) => {
    const aS = a.updatedAt ? (a.updatedAt as { seconds?: number }).seconds || 0 : 0;
    const bS = b.updatedAt ? (b.updatedAt as { seconds?: number }).seconds || 0 : 0;
    return bS - aS;
  });
  return tasks;
}

export const DEFAULT_TASK_WORKSPACES = [
  "Kecerdasan Buatan",
  "Basis Data",
  "Pemrograman Web",
  "Proyek Akhir",
  "Organisasi",
  "Personal",
];

export function getEffectiveWorkspaces(
  tasks: Array<{ workspace?: string; course?: string }>,
  hiddenWorkspaces: string[] = []
): string[] {
  const taskWorkspaces = tasks.map((t) => (t.workspace || t.course || "Umum").trim()).filter(Boolean);
  const combined = Array.from(new Set([...taskWorkspaces, ...DEFAULT_TASK_WORKSPACES]));
  const filtered = combined.filter((w) => !hiddenWorkspaces.includes(w));
  return filtered.length > 0 ? filtered : ["Personal"];
}

export async function deleteWorkspaceTasks(
  userId: string,
  workspaceName: string,
  action: "relocate" | "delete_all" = "relocate"
): Promise<void> {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const batchUpdates: Promise<void>[] = [];

  snap.forEach((d) => {
    const data = d.data() as TaskDocument;
    const currentWs = data.workspace || data.course || "Umum";
    if (currentWs.toLowerCase() === workspaceName.toLowerCase()) {
      if (action === "relocate") {
        batchUpdates.push(
          updateDoc(doc(db, "tasks", d.id), {
            workspace: "Umum",
            course: "Umum",
            updatedAt: serverTimestamp(),
          })
        );
      } else {
        batchUpdates.push(deleteDoc(doc(db, "tasks", d.id)));
      }
    }
  });

  await Promise.all(batchUpdates);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationDocument {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "high_risk" | "critical_alert" | "immediate" | "overdue" | "productivity";
  isRead: boolean;
  createdAt?: unknown;
}

export async function createNotification(
  userId: string,
  data: Omit<NotificationDocument, "id" | "userId" | "isRead" | "createdAt">
): Promise<string> {
  const notifRef = doc(collection(db, "notifications"));
  const notifId = notifRef.id;
  await setDoc(notifRef, {
    ...data,
    id: notifId,
    userId,
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return notifId;
}

export async function getUserNotifications(userId: string): Promise<NotificationDocument[]> {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const notifs: NotificationDocument[] = [];
  snap.forEach((d) => notifs.push(d.data() as NotificationDocument));
  notifs.sort((a, b) => {
    const aS = a.createdAt ? (a.createdAt as { seconds?: number }).seconds || 0 : 0;
    const bS = b.createdAt ? (b.createdAt as { seconds?: number }).seconds || 0 : 0;
    return bS - aS;
  });
  return notifs;
}

export async function markNotificationRead(notifId: string): Promise<void> {
  const notifRef = doc(db, "notifications", notifId);
  await updateDoc(notifRef, { isRead: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  const promises = snap.docs.map((d) => updateDoc(d.ref, { isRead: true }));
  await Promise.all(promises);
}

// ── Pomodoro Sessions ─────────────────────────────────────────────────────────

export interface PomodoroSession {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  duration: number;
  completed: boolean;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}

export async function createPomodoroSession(
  userId: string,
  taskId: string,
  taskTitle: string,
  duration: number
): Promise<string> {
  const sessionRef = doc(collection(db, "pomodoro_sessions"));
  const sessionId = sessionRef.id;
  await setDoc(sessionRef, {
    id: sessionId,
    userId,
    taskId,
    taskTitle,
    duration,
    completed: false,
    startedAt: serverTimestamp(),
  });
  return sessionId;
}

export async function completePomodoroSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "pomodoro_sessions", sessionId);
  await updateDoc(sessionRef, {
    completed: true,
    endedAt: serverTimestamp(),
  });
}

export async function updatePomodoroSession(
  sessionId: string,
  fields: Partial<Omit<PomodoroSession, "id" | "userId" | "startedAt">>
): Promise<void> {
  const sessionRef = doc(db, "pomodoro_sessions", sessionId);
  await updateDoc(sessionRef, {
    ...fields,
    endedAt: serverTimestamp(),
  });
}

export async function deletePomodoroSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "pomodoro_sessions", sessionId);
  await deleteDoc(sessionRef);
}

export async function getUserPomodoroSessions(userId: string): Promise<PomodoroSession[]> {
  const q = query(collection(db, "pomodoro_sessions"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const sessions: PomodoroSession[] = [];
  snap.forEach((d) => sessions.push(d.data() as PomodoroSession));
  sessions.sort((a, b) => {
    const aS = a.startedAt?.seconds || 0;
    const bS = b.startedAt?.seconds || 0;
    return bS - aS;
  });
  return sessions;
}

// ── Screen Time & Daily Activity Tracking ────────────────────────────────────

export interface DailyScreenTime {
  id: string; // e.g. `${userId}_${dateStr}`
  userId: string;
  dateStr: string; // YYYY-MM-DD
  screenTimeSeconds: number;
  updatedAt?: unknown;
}

export async function saveDailyScreenTime(
  userId: string,
  dateStr: string,
  totalSeconds: number
): Promise<void> {
  try {
    const docId = `${userId}_${dateStr}`;
    const docRef = doc(db, "daily_screentime", docId);
    await setDoc(
      docRef,
      {
        id: docId,
        userId,
        dateStr,
        screenTimeSeconds: totalSeconds,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // Firestore rules might not have been applied yet, gracefully ignore
    console.warn("Could not save daily screen time to Firestore:", err);
  }
}

export async function getUserScreenTimes(
  userId: string
): Promise<DailyScreenTime[]> {
  try {
    const q = query(
      collection(db, "daily_screentime"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const list: DailyScreenTime[] = [];
    snap.forEach((d) => list.push(d.data() as DailyScreenTime));
    list.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    return list;
  } catch (err) {
    console.warn("Could not fetch daily screen times from Firestore:", err);
    return [];
  }
}

// ── Account Deletion & Purge All User Data ───────────────────────────────────

export interface AccountDeletionOtp {
  userId: string;
  email: string;
  code: string;
  expiresAt: number; // timestamp in ms
  createdAt?: unknown;
}

export async function getOrCreateAccountDeletionOtp(
  userId: string,
  email: string
): Promise<{ code: string; isNew: boolean; remainingMinutes: number }> {
  const otpRef = doc(db, "account_deletion_otps", userId);
  try {
    const snap = await getDoc(otpRef);
    if (snap.exists()) {
      const data = snap.data() as AccountDeletionOtp;
      // If code exists and is still valid (within 10-minute window)
      if (data && data.code && data.expiresAt && Date.now() < data.expiresAt) {
        const remainingMinutes = Math.max(1, Math.ceil((data.expiresAt - Date.now()) / 60000));
        return { code: data.code, isNew: false, remainingMinutes };
      }
    }
  } catch (err) {
    console.warn("Could not check existing OTP in Firestore:", err);
  }

  // Generate new 6-digit numeric OTP valid for 10 minutes
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    await setDoc(otpRef, {
      userId,
      email,
      code: newCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Could not save new OTP to Firestore:", err);
  }

  return { code: newCode, isNew: true, remainingMinutes: 10 };
}

export async function saveAccountDeletionOtp(
  userId: string,
  email: string,
  code: string
): Promise<void> {
  const otpRef = doc(db, "account_deletion_otps", userId);
  await setDoc(otpRef, {
    userId,
    email,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    createdAt: serverTimestamp(),
  });
}

export async function verifyAccountDeletionOtp(
  userId: string,
  enteredCode: string
): Promise<{ valid: boolean; message?: string }> {
  const otpRef = doc(db, "account_deletion_otps", userId);
  const snap = await getDoc(otpRef);
  if (!snap.exists()) {
    return { valid: false, message: "Kode verifikasi tidak ditemukan. Silakan minta kode baru." };
  }
  const data = snap.data() as AccountDeletionOtp;
  if (Date.now() > data.expiresAt) {
    return { valid: false, message: "Kode verifikasi telah kedaluwarsa (lebih dari 10 menit). Silakan minta kode baru." };
  }
  if (data.code.trim() !== enteredCode.trim()) {
    return { valid: false, message: "Kode verifikasi salah. Periksa kembali email Anda." };
  }
  return { valid: true };
}


export async function purgeAllUserData(userId: string): Promise<void> {
  const deleteBatch: Promise<void>[] = [];

  // Helper to delete all docs in a query safely
  const purgeQuery = async (colName: string) => {
    try {
      const q = query(collection(db, colName), where("userId", "==", userId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        deleteBatch.push(deleteDoc(doc(db, colName, d.id)).catch(() => {}));
      });
    } catch {
      // ignore collection query permission errors
    }
  };

  // 1. Notes
  await purgeQuery("notes");

  // 2. Note Summaries
  await purgeQuery("note_summaries");

  // 3. Chat History
  await purgeQuery("chat_history");

  // 4. Tasks
  await purgeQuery("tasks");

  // 5. Notifications
  await purgeQuery("notifications");

  // 6. Pomodoro Sessions
  await purgeQuery("pomodoro_sessions");

  // 7. Daily Screen Time
  await purgeQuery("daily_screentime");

  // 8. Direct User Docs
  deleteBatch.push(deleteDoc(doc(db, "academic_assessments", userId)).catch(() => {}));
  deleteBatch.push(deleteDoc(doc(db, "academic_insights", userId)).catch(() => {}));
  deleteBatch.push(deleteDoc(doc(db, "account_deletion_otps", userId)).catch(() => {}));
  deleteBatch.push(deleteDoc(doc(db, "users", userId)).catch(() => {}));

  await Promise.all(deleteBatch);
}


