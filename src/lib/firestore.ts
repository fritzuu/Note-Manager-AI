import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserDocument {
  uid: string;
  name: string;
  email: string;
  assessmentCompleted: boolean;
  createdAt?: unknown;
}

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

export async function markAssessmentComplete(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { assessmentCompleted: true });
}
