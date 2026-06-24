export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerContentWatcher } = await import("@voxx/core");
  await registerContentWatcher();
}
