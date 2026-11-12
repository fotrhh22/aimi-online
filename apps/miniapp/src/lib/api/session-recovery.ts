// One recovery for concurrent 401s. Never revive a logged-out/switched account.
export function createSessionRecovery(deps: {
  read: () => string | null;
  write: (token: string) => void;
  authenticate: () => Promise<string | null>;
}) {
  let pending: { from: string; promise: Promise<string | null> } | undefined;
  let renewed: { from: string; to: string } | undefined;
  const current = (from: string | null) =>
    deps.read() === from ||
    Boolean(from && renewed?.from === from && deps.read() === renewed.to);
  return {
    current,
    async recover(from: string): Promise<string | null> {
      if (renewed?.from === from && deps.read() === renewed.to)
        return renewed.to;
      if (deps.read() !== from) return null;
      if (pending?.from === from) return pending.promise;
      const promise = (async () => {
        const next = await deps.authenticate();
        if (!next || deps.read() !== from) return null;
        deps.write(next);
        renewed = { from, to: next };
        return next;
      })();
      pending = { from, promise };
      try {
        return await promise;
      } finally {
        if (pending?.promise === promise) pending = undefined;
      }
    },
  };
}
