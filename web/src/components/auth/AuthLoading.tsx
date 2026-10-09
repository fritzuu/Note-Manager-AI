import s from "./auth.module.css";

export function FlowLoader() {
  return <span className={s.flowLoader} aria-hidden="true"><span /><span /><span /></span>;
}

export function AuthFormLoading() {
  return <div className={s.formLoading} role="status" aria-label="Menyiapkan halaman">
    <div className={s.loadingHeading}><span /><span /></div>
    <div className={s.loadingLine} />
    <div className={s.loadingPill} />
    <div className={s.loadingSeparator} />
    <div className={s.loadingField}><span /><span /></div>
    <div className={s.loadingField}><span /><span /></div>
    <div className={s.loadingAction}><FlowLoader /></div>
  </div>;
}

export function AuthSceneLoading() {
  return <div className={s.sceneLoading} aria-hidden="true">
    <div className={s.loadingSculpture}><span /><span /><span /></div>
    <div className={s.loadingShadow} />
  </div>;
}
