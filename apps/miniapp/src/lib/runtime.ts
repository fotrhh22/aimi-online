/** Explicit web builds must never infer Toss from a public hostname. */
export const webDemoRuntime = import.meta.env.VITE_APP_RUNTIME === "web-demo";
export const localRuntime =
  !webDemoRuntime && ["localhost", "127.0.0.1"].includes(location.hostname);
export const browserRuntime = webDemoRuntime || localRuntime;
export const tossRuntime = !browserRuntime;
