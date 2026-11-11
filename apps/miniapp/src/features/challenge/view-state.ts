/** Keep selection, confirmation and saved results mutually exclusive. */
export function challengeStage(path: string, closed: boolean) {
  if (path.startsWith("/challenge/answer/")) return "answer";
  if (
    closed ||
    path.startsWith("/challenge/result/") ||
    /[?&]result=/.test(path)
  )
    return "result";
  return path.startsWith("/challenge/combination")
    ? "combination"
    : "selection";
}

export function selectChallengeResult<
  T extends { id: string; attemptNumber?: number },
>(attempts: T[], requestedId?: string | null) {
  const ordered = [...attempts].sort(
    (a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0),
  );
  const numbered = ordered.map((a, index) => ({
    ...a,
    attemptNumber: a.attemptNumber ?? index + 1,
  }));
  const current = requestedId
    ? numbered.find((a) => a.id === requestedId)
    : numbered.at(-1);
  return {
    current,
    previous: current
      ? numbered.filter((a) => a.attemptNumber < current.attemptNumber)
      : [],
  };
}

/** Product back destinations, independent of which screen happens to be in history. */
export function challengeBackTarget(path: string): string | null {
  if (!path.startsWith("/challenge")) return null;
  if (path.startsWith("/challenge/answer/"))
    return (
      "/challenge/result/" +
      path.slice("/challenge/answer/".length).split("?")[0]
    );
  if (path.startsWith("/challenge/result/") || /[?&]result=/.test(path))
    return "/mission";
  return path.startsWith("/challenge/combination") ? "/challenge" : "/mission";
}

export function matchingChallengeAttempt<T extends { keywordIds: string[] }>(
  attempts: T[],
  ids: string[],
): T | undefined {
  return [...attempts]
    .reverse()
    .find(
      (a) =>
        a.keywordIds.length === ids.length &&
        a.keywordIds.every((id) => ids.includes(id)),
    );
}
