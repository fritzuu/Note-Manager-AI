/** Prevent an unavailable profile store from keeping authentication UI busy forever. */
export async function awaitAuthProfile<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("Authentication profile timed out"), { code: "auth/profile-timeout" })), 12000);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
