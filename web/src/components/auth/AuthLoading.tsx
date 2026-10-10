import { LoadingScreen } from "@/components/ui/LoadingScreen";
import s from "./auth.module.css";

export function FlowLoader() {
  return <span className={s.flowLoader} aria-hidden="true"><span /><span /><span /></span>;
}

export function AuthFormLoading() {
  return <LoadingScreen compact label="Menyiapkan halaman" subtext="" />;
}

export function AuthSceneLoading() {
  return <div className={s.sceneLoading} aria-hidden="true" />;
}
