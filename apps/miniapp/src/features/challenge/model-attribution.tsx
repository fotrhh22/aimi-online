import { getModelCatalog } from "../../lib/api/catalog";
import React, { useEffect, useState } from "react";
import { useApp } from "../../app/context";

export function ModelAttribution({ modelId }: { modelId: string }) {
  const a = useApp();
  const [model, setModel] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getModelCatalog()
      .then((r) => {
        if (!cancelled)
          setModel(r.models.find((m) => m.id === modelId) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [modelId]);
  const name = model?.id === modelId ? model.name : modelId;
  return (
    <div className="challenge-model-attribution">
      <p>
        사용된 모델: <strong>{name}</strong>
      </p>
      <button
        className="text-link model-info-link"
        aria-label={name + " 모델 자세히 알아보기"}
        onClick={() => a.navigate("/models/" + encodeURIComponent(modelId))}
      >
        <strong>자세히 알아보기 ›</strong>
      </button>
    </div>
  );
}
