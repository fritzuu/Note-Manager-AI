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
  createdAt?: unknown;
}

export async function createUserDocument(
  uid: string,
  data: Omit<UserDocument, "createdAt">
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
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
  await setDoc(userRef, { assessmentCompleted: true }, { merge: true });
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
    attachments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return noteId;
}

export async function updateNote(
  noteId: string,
  fields: Partial<Omit<NoteDocument, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const noteRef = doc(db, "notes", noteId);
  await updateDoc(noteRef, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function duplicateNote(note: NoteDocument): Promise<string> {
  const noteRef = doc(collection(db, "notes"));
  const noteId = noteRef.id;
  
  // Extract fields and exclude timestamps to avoid Firestore type mismatch
  const rest = { ...note } as Partial<NoteDocument>;
  delete rest.id;
  delete rest.createdAt;
  delete rest.updatedAt;
  
  await setDoc(noteRef, {
    ...rest,
    id: noteId,
    title: `${note.title} (Copy)`,
    isPinned: false,
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

export async function getUserNotes(userId: string): Promise<NoteDocument[]> {
  const q = query(
    collection(db, "notes"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const notes: NoteDocument[] = [];
  snap.forEach((docSnap) => {
    notes.push(docSnap.data() as NoteDocument);
  });
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

// ── Workspaces ───────────────────────────────────────────────────────────────

export interface WorkspaceDocument {
  id: string;
  userId: string;
  name: string;
  createdAt?: unknown;
}

export async function createWorkspace(userId: string, name: string): Promise<string> {
  const wsRef = doc(collection(db, "workspaces"));
  const wsId = wsRef.id;
  await setDoc(wsRef, {
    id: wsId,
    userId,
    name,
    createdAt: serverTimestamp(),
  });
  return wsId;
}

export async function getUserWorkspaces(userId: string): Promise<WorkspaceDocument[]> {
  const q = query(collection(db, "workspaces"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const list: WorkspaceDocument[] = [];
  snap.forEach((d) => list.push(d.data() as WorkspaceDocument));
  list.sort((a, b) => {
    const timeA = a.createdAt ? (a.createdAt as { seconds?: number }).seconds || 0 : 0;
    const timeB = b.createdAt ? (b.createdAt as { seconds?: number }).seconds || 0 : 0;
    return timeA - timeB;
  });
  return list;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await deleteDoc(doc(db, "workspaces", workspaceId));
  const q = query(collection(db, "tasks"), where("workspaceId", "==", workspaceId));
  const snap = await getDocs(q);
  const promises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(promises);
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<void> {
  const wsRef = doc(db, "workspaces", workspaceId);
  await updateDoc(wsRef, { name });
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskDocument {
  id: string;
  userId: string;
  workspaceId?: string;
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
