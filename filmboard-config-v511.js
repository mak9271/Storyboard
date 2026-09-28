// FilmBoard v5.11.0 deployment configuration
(() => {
  let saved=null;try{saved=localStorage.getItem("filmboard-theme-preference")}catch(error){}
  const preference=["system","light","dark"].includes(saved)?saved:"system";
  const theme=preference==="system"?(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches?"dark":"light"):preference;
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.dataset.theme=theme
})();
window.APP_CONFIG = {
  SUPABASE_URL: "https://xpqhsnyyjpfxpxvvrvsz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_T9Mj26dEhg1F0DO9grHY1Q_Y7j10oeI",
  SITE_URL: "https://storyboard.mak9271.workers.dev"
};
