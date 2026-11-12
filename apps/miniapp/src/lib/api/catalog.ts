import type { ModelRecord } from "@aimi/contracts";
import { request, token } from "./client";

// Public model metadata only: no questions, recommendations or user records.
type Catalog = { models: ModelRecord[] };
let cached: { value: Catalog; until: number } | undefined;
let pending: Promise<Catalog> | undefined;
export function getModelCatalog(): Promise<Catalog> {
  if (!token()) return request<Catalog>("/v1/models");
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.value);
  if (pending) return pending;
  const task = request<Catalog>("/v1/models").then((value) => {
    cached = { value, until: Date.now() + 300000 };
    return value;
  });
  pending = task;
  void task
    .finally(() => {
      if (pending === task) pending = undefined;
    })
    .catch(() => {});
  return task;
}
