import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
  deleteUser,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";
import {
  createUserDocument,
  getUserDocument,
  getOrCreateAccountDeletionOtp,
  saveAccountDeletionOtp,
  verifyAccountDeletionOtp,
  purgeAllUserData,
} from "./firestore";

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await createUserDocument(credential.user.uid, {
    uid: credential.user.uid,
    name,
    email,
    assessmentCompleted: false,
  });

  // Automatically send email verification
  try {
    await sendEmailVerification(credential.user);
  } catch (err) {
    console.warn("Could not send initial email verification:", err);
  }

  return credential;
}

export async function sendVerificationEmail(targetUser?: User | null): Promise<void> {
  const user = targetUser || auth.currentUser;
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  await sendEmailVerification(user);
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<{
  credential: UserCredential;
  isNewUser: boolean;
}> {
  const credential = await signInWithPopup(auth, googleProvider);
  const { user } = credential;

  const existingDoc = await getUserDocument(user.uid);
  let isNewUser = false;

  if (!existingDoc) {
    isNewUser = true;
    await createUserDocument(user.uid, {
      uid: user.uid,
      name: user.displayName ?? "",
      email: user.email ?? "",
      assessmentCompleted: false,
    });
  }

  return { credential, isNewUser };
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get or create a persistent 6-digit OTP code valid for 10 minutes
 */
export async function sendAccountDeletionOtp(user: User): Promise<{
  success: boolean;
  email: string;
  isNew: boolean;
  remainingMinutes: number;
}> {
  if (!user || !user.email) {
    throw new Error("Pengguna atau email tidak valid.");
  }

  // 1. Get or create persistent 10-minute OTP
  const { code, isNew, remainingMinutes } = await getOrCreateAccountDeletionOtp(
    user.uid,
    user.email
  );

  // 2. Save to sessionStorage as a resilient client fallback with same expiration
  try {
    sessionStorage.setItem(
      "mf_deletion_otp",
      JSON.stringify({
        userId: user.uid,
        code,
        expiresAt: Date.now() + remainingMinutes * 60 * 1000,
      })
    );
  } catch {
    // ignore
  }

  // 3. Send request to API endpoint (which sends real email via Gmail SMTP)
  try {
    await fetch("/api/auth/send-deletion-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        displayName: user.displayName || "Mahasiswa",
        code,
      }),
    });
  } catch (err) {
    console.warn("Email API notification failed:", err);
  }

  return {
    success: true,
    email: user.email,
    isNew,
    remainingMinutes,
  };
}

/**
 * Final execution of Account Deletion:
 * 1. Verifies 6-digit OTP (Firestore or Session Fallback)
 * 2. Purges all user data in Firestore
 * 3. Deletes Firebase Auth User
 */
export async function executeAccountDeletion(
  user: User,
  enteredCode: string
): Promise<{ success: boolean; message?: string }> {
  if (!user) {
    return { success: false, message: "Pengguna tidak terautentikasi." };
  }

  // Check OTP from Firestore or Session Fallback
  let isValid = false;
  try {
    const verification = await verifyAccountDeletionOtp(user.uid, enteredCode);
    if (verification.valid) {
      isValid = true;
    }
  } catch {
    // fallback to session
  }

  if (!isValid) {
    try {
      const sessionData = sessionStorage.getItem("mf_deletion_otp");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (
          parsed.userId === user.uid &&
          parsed.code === enteredCode.trim() &&
          Date.now() <= parsed.expiresAt
        ) {
          isValid = true;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!isValid) {
    return { success: false, message: "Kode verifikasi salah atau telah kedaluwarsa. Periksa kembali email Anda." };
  }

  // 1. Purge all Firestore data safely
  try {
    await purgeAllUserData(user.uid);
  } catch (purgeErr) {
    console.warn("Purge user data completed with partial warnings:", purgeErr);
  }

  // 2. Delete Auth Account
  try {
    await deleteUser(user);
  } catch (authErr: unknown) {
    const errObj = authErr as { code?: string; message?: string };
    if (errObj.code === "auth/requires-recent-login") {
      return {
        success: false,
        message: "Demi keamanan, mohon keluar dan masuk kembali (re-login) sebelum melakukan penghapusan akun permanen.",
      };
    }
    return {
      success: false,
      message: errObj.message || "Gagal menghapus kredensial autentikasi. Silakan login ulang.",
    };
  }

  // 3. Clear Cookies & Session
  try {
    sessionStorage.removeItem("mf_deletion_otp");
  } catch {
    // ignore
  }
  document.cookie = "auth-token=; path=/; max-age=0";
  document.cookie = "__session=; path=/; max-age=0";

  return { success: true };
}


