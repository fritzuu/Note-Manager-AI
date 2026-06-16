import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";
import { createUserDocument, getUserDocument } from "./firestore";

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
  return credential;
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
