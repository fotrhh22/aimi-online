export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export function normalizedInsets(value: unknown): Insets {
  const v = (value ?? {}) as Partial<Insets>;
  const pixel = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.min(400, n))
      : 0;
  return {
    top: pixel(v.top),
    right: pixel(v.right),
    bottom: pixel(v.bottom),
    left: pixel(v.left),
  };
}
