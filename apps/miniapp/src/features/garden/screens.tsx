import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../app/context";
import { Asset, Button, Icon, Modal, Notice, Stats } from "../../ui/primitives";
import { request, setToken } from "../../lib/api/client";
import { copy, invite } from "../../lib/toss/bridge";
import { NicknameForm } from "../profile/screens";
import { SupportContact } from "../legal/privacy";
import {
  gardenPlacements,
  gardenPlacementId,
  ownedItemCount,
  remainingItemCount,
  gardenItemSize,
  gardenAssetId,
  GARDEN_ASPECT,
  clampGardenPlacement,
  newGardenPlacement,
  MAX_GARDEN_ITEMS,
  type GardenPlacement,
  type CatalogItem,
  type UserState,
} from "@aimi/contracts";

export function GardenScene({
  character,
  garden,
  catalog = [],
  editing = false,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onEdit,
}: {
  character: string;
  garden: {
    placements?: GardenPlacement[];
    slots?: Record<string, string | null>;
  };
  catalog?: CatalogItem[];
  editing?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (p: GardenPlacement) => void;
  onRemove?: (id: string) => void;
  onEdit?: () => void;
}) {
  const scene = useRef<HTMLDivElement>(null),
    drag = useRef<{
      pointer: number;
      startX: number;
      startY: number;
      origin: GardenPlacement;
    } | null>(null);
  const placements = gardenPlacements(garden),
    name = (id: string) => catalog.find((i) => i.id === id)?.name ?? id;
  const keyMove = (e: React.KeyboardEvent, p: GardenPlacement) => {
    const distance = e.shiftKey ? 0.08 : 0.025;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
    };
    if (deltas[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      const [dx, dy] = deltas[e.key];
      onSelect?.(gardenPlacementId(p));
      onMove?.(clampGardenPlacement({ ...p, x: p.x + dx, y: p.y + dy }));
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      onRemove?.(gardenPlacementId(p));
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onSelect?.(null);
    }
  };
  return (
    <div
      className={"garden-scene free-garden " + (editing ? "editable" : "")}
      ref={scene}
      style={{ aspectRatio: GARDEN_ASPECT }}
      role="group"
      aria-label={editing ? "정원 배치 편집" : "정원 미리보기"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect?.(null);
      }}
    >
      <span className="garden-sun" />
      {placements.map((p) => {
        const size = gardenItemSize(p.itemId),
          style: React.CSSProperties = {
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: `${size.width * 100}%`,
            height: `${size.height * 100}%`,
            zIndex:
              editing && selectedId === gardenPlacementId(p)
                ? 2000
                : Math.round(p.y * 1000),
          };
        const asset = catalog.find((i) => i.id === p.itemId)?.asset ?? p.itemId;
        return editing ? (
          <button
            type="button"
            key={gardenPlacementId(p)}
            className={
              "garden-item placed-item " +
              (selectedId === gardenPlacementId(p) ? "selected" : "")
            }
            data-item-id={p.itemId}
            data-instance-id={gardenPlacementId(p)}
            style={style}
            aria-label={name(p.itemId) + " 위치 이동"}
            aria-pressed={selectedId === gardenPlacementId(p)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(gardenPlacementId(p));
            }}
            onKeyDown={(e) => keyMove(e, p)}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              onSelect?.(gardenPlacementId(p));
              drag.current = {
                pointer: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                origin: { ...p },
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current,
                rect = scene.current?.getBoundingClientRect();
              if (
                !d ||
                d.pointer !== e.pointerId ||
                gardenPlacementId(d.origin) !== gardenPlacementId(p) ||
                !rect?.width ||
                !rect.height
              )
                return;
              e.preventDefault();
              onMove?.(
                clampGardenPlacement({
                  ...d.origin,
                  x: d.origin.x + (e.clientX - d.startX) / rect.width,
                  y: d.origin.y + (e.clientY - d.startY) / rect.height,
                }),
              );
            }}
            onPointerUp={(e) => {
              if (drag.current?.pointer !== e.pointerId) return;
              drag.current = null;
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <Asset id={gardenAssetId(asset)} />
          </button>
        ) : (
          <div
            key={gardenPlacementId(p)}
            className="garden-item placed-item"
            data-item-id={p.itemId}
            data-instance-id={gardenPlacementId(p)}
            style={style}
            role="img"
            aria-label={name(p.itemId)}
          >
            <Asset id={gardenAssetId(asset)} />
          </div>
        );
      })}
      <div
        className="free-garden-character"
        role="img"
        aria-label={name(character)}
      >
        <Asset
          id={catalog.find((i) => i.id === character)?.asset ?? character}
          size={100}
        />
      </div>
      {onEdit && (
        <button
          className="garden-pencil icon-button"
          aria-label="정원 편집"
          onClick={onEdit}
        >
          <Icon name="edit" />
        </button>
      )}
    </div>
  );
}
export function Garden() {
  const a = useApp(),
    s = a.data!,
    editing = a.path === "/garden/edit",
    catalog = a.content!.catalog;
  const [tab, setTab] = useState<"items" | "characters">("items"),
    [character, setCharacter] = useState(s.character),
    [placements, setPlacements] = useState(() => gardenPlacements(s.garden)),
    [revision, setRevision] = useState(s.garden.revision),
    [picker, setPicker] = useState(false),
    [choice, setChoice] = useState(s.character),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [unsaved, setUnsaved] = useState(false),
    [leaveTarget, setLeaveTarget] = useState("/garden");
  useEffect(() => {
    setCharacter(s.character);
    setPlacements(gardenPlacements(s.garden));
    setRevision(s.garden.revision);
    setSelectedId(null);
  }, [s.garden.revision, s.character]);
  const dirty =
    character !== s.character ||
    JSON.stringify(placements) !== JSON.stringify(gardenPlacements(s.garden));
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (editing && dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [editing, dirty]);
  useEffect(() => {
    a.blockNavigation((next) => {
      if (editing && dirty) {
        setLeaveTarget(next);
        setUnsaved(true);
        return false;
      }
      return true;
    });
    return () => a.blockNavigation(null);
  }, [editing, dirty, a.blockNavigation]);
  const name = (id: string) => catalog.find((i) => i.id === id)?.name ?? id;
  const remove = (id: string) => {
    setPlacements((old) => old.filter((p) => gardenPlacementId(p) !== id));
    setSelectedId(null);
  };
  const move = (p: GardenPlacement) =>
    setPlacements((old) =>
      old.map((item) =>
        gardenPlacementId(item) === gardenPlacementId(p) ? p : item,
      ),
    );
  const add = (id: string) => {
    if (remainingItemCount(s.inventory, placements, id) <= 0) {
      const placed = placements.find((p) => p.itemId === id);
      if (placed) setSelectedId(gardenPlacementId(placed));
      a.setToast(
        "모두 정원에 배치했어요. 배치를 해제하면 수집함으로 돌아와요.",
      );
      return;
    }
    if (placements.length >= MAX_GARDEN_ITEMS) {
      a.setToast("정원에는 최대 12개까지 배치할 수 있어요.");
      return;
    }
    const placement = {
      ...newGardenPlacement(id, placements.length),
      instanceId: crypto.randomUUID(),
    };
    setPlacements((old) => [...old, placement]);
    setSelectedId(placement.instanceId);
    requestAnimationFrame(() =>
      document
        .querySelector(".free-garden")
        ?.scrollIntoView({ block: "nearest" }),
    );
  };
  const save = async (target = "/garden") => {
    const origin = a.path;
    const r = await a.perform(
      () =>
        request("/v1/garden", "PUT", {
          revision,
          character,
          placements: placements.map(clampGardenPlacement),
        }),
      "정원에 적용했어요.",
    );
    if (r && a.isCurrentPath(origin)) {
      setUnsaved(false);
      setPicker(false);
      setSelectedId(null);
      a.blockNavigation(null);
      a.navigate(target, { replace: true });
    }
  };
  const selected = placements.find((p) => gardenPlacementId(p) === selectedId);
  return (
    <>
      <GardenScene
        character={editing ? character : s.character}
        garden={editing ? { placements } : s.garden}
        catalog={catalog}
        editing={editing}
        selectedId={selectedId}
        onSelect={editing ? setSelectedId : undefined}
        onMove={editing ? move : undefined}
        onRemove={editing ? remove : undefined}
        onEdit={editing ? undefined : () => a.navigate("/garden/edit")}
      />
      {!editing ? (
        <div className="store-grid section">
          {[
            ["/shop/characters", "캐릭터 상점"],
            ["/shop/garden", "정원 상점"],
          ].map(([url, title]) => (
            <button onClick={() => a.navigate(url)} key={url}>
              <span className="store-illustration">
                <i />
                <b />
              </span>
              <strong>{title}</strong>
            </button>
          ))}
        </div>
      ) : (
        <>
          {selected && (
            <div className="garden-selection">
              <div className="garden-selection-heading">
                <strong>{name(selected.itemId)}</strong>
                <button
                  className="text-link"
                  onClick={() => remove(gardenPlacementId(selected))}
                >
                  배치 해제
                </button>
              </div>
            </div>
          )}
          <div className="text-tabs section">
            <button
              aria-selected={tab === "items"}
              onClick={() => setTab("items")}
            >
              아이템
            </button>
            <button
              aria-selected={tab === "characters"}
              onClick={() => setTab("characters")}
            >
              캐릭터
            </button>
          </div>
          <p className="muted caption">
            {tab === "items"
              ? `배치 ${placements.length}/${MAX_GARDEN_ITEMS} · 눌러 추가하고 끌어 옮겨요.`
              : "상자를 눌러 보유 캐릭터를 바꿔보세요."}
          </p>
          {tab === "items" ? (
            <div
              className="inventory-grid farm-inventory"
              aria-label="정원 수집함"
            >
              {catalog
                .filter((i) => i.kind === "item" && s.inventory.includes(i.id))
                .map((i) => (
                  <button
                    key={i.id}
                    aria-label={
                      i.name +
                      (remainingItemCount(s.inventory, placements, i.id) > 0
                        ? " 정원에 추가"
                        : " 배치 중")
                    }
                    aria-description={
                      "남은 수량 " +
                      remainingItemCount(s.inventory, placements, i.id) +
                      "개"
                    }
                    aria-pressed={placements.some(
                      (p) =>
                        p.itemId === i.id &&
                        gardenPlacementId(p) === selectedId,
                    )}
                    onClick={() => add(i.id)}
                  >
                    <Asset id={i.asset} size={32} />
                    <strong>{i.name}</strong>
                    <small className="inventory-count">
                      ×{remainingItemCount(s.inventory, placements, i.id)}
                    </small>
                    <span className="inventory-empty">
                      {remainingItemCount(s.inventory, placements, i.id) === 0
                        ? "모두 배치 중"
                        : ""}
                    </span>
                  </button>
                ))}
              {!catalog.some(
                (i) => i.kind === "item" && s.inventory.includes(i.id),
              ) && <p>상점에서 아이템을 구매하면 여기에 보여요.</p>}
            </div>
          ) : (
            <button
              className="current-character"
              onClick={() => {
                setChoice(character);
                setPicker(true);
              }}
            >
              <Asset id={character} size={64} />
              <span>
                <strong>{name(character)}</strong>
                <small>착용 중</small>
              </span>
              <span>›</span>
            </button>
          )}
          <div className="button-row">
            <Button
              weak
              onClick={() => a.navigate("/garden", { replace: true })}
            >
              취소
            </Button>
            <Button loading={a.busy} onClick={() => void save()}>
              변경사항 저장
            </Button>
          </div>
        </>
      )}
      {picker && (
        <Modal title="캐릭터 변경" onClose={() => setPicker(false)}>
          <p className="caption">
            착용 중인 {name(character)}을 제외한 보유 목록이에요.
          </p>
          <div className="picker-list">
            {catalog
              .filter(
                (i) =>
                  i.kind === "character" &&
                  s.inventory.includes(i.id) &&
                  i.id !== character,
              )
              .map((i) => (
                <button
                  key={i.id}
                  aria-pressed={choice === i.id}
                  onClick={() => setChoice(i.id)}
                >
                  <Asset id={i.asset} size={56} />
                  <span>
                    <strong>{i.name}</strong>
                    <small>{choice === i.id ? "선택됨" : "보유 중"}</small>
                  </span>
                  {choice === i.id && <b>✓</b>}
                </button>
              ))}
          </div>
          {!catalog.some(
            (i) =>
              i.kind === "character" &&
              s.inventory.includes(i.id) &&
              i.id !== character,
          ) && <p>다른 캐릭터를 구매하면 선택할 수 있어요.</p>}
          <p className="caption">선택한 뒤 정원 편집에서 저장해주세요.</p>
          <div className="dialog-actions button-row">
            <Button weak onClick={() => setPicker(false)}>
              닫기
            </Button>
            <Button
              disabled={choice === character}
              onClick={() => {
                setCharacter(choice);
                setPicker(false);
              }}
            >
              선택하기
            </Button>
          </div>
        </Modal>
      )}
      {unsaved && (
        <Modal
          title="변경사항을 저장할까요?"
          onClose={() => {
            setUnsaved(false);
          }}
        >
          <p>
            아이템 배치와 캐릭터 변경이 아직 저장되지 않았어요.
            <br />
            저장하지 않으면 이전 정원으로 돌아가요.
          </p>
          <div className="dialog-actions">
            <Button weak onClick={() => setUnsaved(false)}>
              닫기
            </Button>
            <Button loading={a.busy} onClick={() => void save(leaveTarget)}>
              저장하기
            </Button>
            <button
              className="text-link"
              disabled={a.busy}
              onClick={() => {
                setCharacter(s.character);
                setPlacements(gardenPlacements(s.garden));
                setSelectedId(null);
                setUnsaved(false);
                a.blockNavigation(null);
                a.navigate(leaveTarget, { replace: true });
              }}
            >
              저장하지 않고 나가기
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Shop() {
  const a = useApp(),
    s = a.data!,
    characters = a.path === "/shop/characters",
    [selected, setSelected] = useState<CatalogItem | null>(null),
    [done, setDone] = useState<{
      item: CatalogItem;
      quantity: number;
      balance: number;
    } | null>(null),
    [quantity, setQuantity] = useState(1);
  const ownedCharacter = Boolean(
    characters && selected && s.inventory.includes(selected.id),
  );
  const buy = async () => {
    if (!selected) return;
    const origin = a.path;
    const item = selected;
    const r = await a.perform(
      () =>
        request<{ balance: number }>("/v1/purchases", "POST", {
          itemId: item.id,
          quantity: characters ? 1 : quantity,
        }),
      undefined,
      "background",
    );
    if (r && a.isCurrentPath(origin)) {
      setSelected(null);
      setDone({
        item,
        quantity: characters ? 1 : quantity,
        balance: r.balance,
      });
    }
  };
  return (
    <>
      <div className="product-grid">
        {a
          .content!.catalog.filter(
            (i) => i.kind === (characters ? "character" : "item"),
          )
          .map((i) => (
            <button
              key={i.id}
              className={"product " + (s.character === i.id ? "selected" : "")}
              onClick={() => {
                setQuantity(1);
                setSelected(i);
              }}
            >
              <Asset id={i.id} size={90} />
              <strong>{i.name}</strong>
              <small>
                {s.character === i.id
                  ? "사용 중"
                  : s.inventory.includes(i.id)
                    ? characters
                      ? "보유 중"
                      : `보유 ×${ownedItemCount(s.inventory, i.id)} · ${i.price} EP`
                    : i.price + " EP"}
              </small>
            </button>
          ))}
      </div>
      <div className="section">
        <Notice
          title={characters ? "구매하거나 선택하세요" : "상품을 눌러 미리보기"}
        >
          {characters
            ? "구매한 캐릭터는 정원 편집에서 선택하면 정원과 모든 게임에 함께 적용해요."
            : "가격·구매 후 잔액을 확인하고 구매해요."}
        </Notice>
      </div>
      {selected && (
        <Modal
          title={
            ownedCharacter
              ? "보유 중이에요"
              : characters
                ? "이 캐릭터를 구매할까요?"
                : "이 아이템을 구매할까요?"
          }
          onClose={() => {
            setSelected(null);
          }}
        >
          <div className="product-preview">
            <Asset id={selected.id} size={100} />
          </div>
          <h3>{selected.name}</h3>
          {!characters && (
            <div
              className="purchase-quantity"
              role="group"
              aria-label="구매 수량"
            >
              <span>구매 수량</span>
              <div>
                <button
                  aria-label="구매 수량 줄이기"
                  disabled={a.busy || quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                >
                  −
                </button>
                <output aria-live="polite" aria-label="선택 수량">
                  {quantity}
                </output>
                <button
                  aria-label="구매 수량 늘리기"
                  disabled={
                    a.busy ||
                    quantity >=
                      Math.min(
                        99 - ownedItemCount(s.inventory, selected.id),
                        Math.floor(s.balance / selected.price),
                      )
                  }
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}
          {ownedCharacter ? (
            <div className="dialog-actions">
              <Button
                onClick={() => {
                  setSelected(null);
                  a.navigate("/garden/edit");
                }}
              >
                정원 편집으로
              </Button>
            </div>
          ) : (
            <>
              <Stats
                rows={[
                  [
                    "가격",
                    selected.price + " EP" + (!characters ? " / 개" : ""),
                  ],
                  ["합계", selected.price * quantity + " EP"],
                  [
                    "구매 후 보유 EP",
                    s.balance >= selected.price * quantity
                      ? s.balance - selected.price * quantity + " EP"
                      : "EP가 부족해요",
                  ],
                ]}
              />
              <p className="caption">
                구매 후 정원 편집에서 직접 적용해주세요.
              </p>
              <div className="dialog-actions">
                <Button weak onClick={() => setSelected(null)}>
                  닫기
                </Button>
                <Button
                  loading={a.busy}
                  disabled={
                    s.balance < selected.price * quantity ||
                    ownedItemCount(s.inventory, selected.id) + quantity > 99
                  }
                  onClick={() => void buy()}
                >
                  구매하기
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
      {done && (
        <Modal title="구매가 완료됐어요" onClose={() => setDone(null)}>
          <div className="product-preview">
            <Asset id={done.item.id} size={90} />
          </div>
          <h3>
            {done.item.name}
            {done.quantity > 1 ? ` ×${done.quantity}` : ""}
          </h3>
          <Stats rows={[["구매 후 보유 EP", done.balance + " EP"]]} />
          <p>
            보유 아이템에 추가했어요.
            <br />
            정원 편집에서 직접 장착해주세요.
          </p>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                setDone(null);
                a.navigate("/garden/edit");
              }}
            >
              정원 편집으로
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
type Person = {
  id: string;
  name: string;
  character: string;
  code: string;
  request: boolean;
  status: string;
  challengeSuccessCount: number;
};
function FriendVisitButton({
  person: p,
  disabled,
  onVisit,
  onDelete,
}: {
  person: Person;
  disabled: boolean;
  onVisit: () => void;
  onDelete: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef({ x: 0, y: 0, consumed: false });
  const clearHold = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clearHold(), []);
  return (
    <button
      className="friend-visit"
      disabled={disabled}
      aria-describedby={!p.request ? "friend-long-press-help" : undefined}
      onPointerDown={(e) => {
        clearHold();
        gesture.current = { x: e.clientX, y: e.clientY, consumed: false };
        if (p.request || disabled || !e.isPrimary || e.button !== 0) return;
        const target = e.currentTarget;
        timer.current = setTimeout(() => {
          timer.current = null;
          gesture.current.consumed = true;
          target.focus({ preventScroll: true });
          onDelete();
        }, 550);
      }}
      onPointerMove={(e) => {
        if (
          Math.hypot(
            e.clientX - gesture.current.x,
            e.clientY - gesture.current.y,
          ) > 10
        ) {
          clearHold();
          gesture.current.consumed = true;
        }
      }}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={() => {
        clearHold();
        gesture.current.consumed = true;
      }}
      onContextMenu={(e) => {
        if (p.request) return;
        e.preventDefault();
        clearHold();
        gesture.current.consumed = true;
        onDelete();
      }}
      onKeyDown={(e) => {
        if (
          !p.request &&
          (e.key === "Delete" || (e.shiftKey && e.key === "F10"))
        ) {
          e.preventDefault();
          clearHold();
          onDelete();
        }
      }}
      onClick={(e) => {
        clearHold();
        if (gesture.current.consumed && e.detail !== 0) {
          e.preventDefault();
          return;
        }
        onVisit();
      }}
    >
      <Asset id={p.character} size={64} />
      <span>
        <strong>{p.name}</strong>
        <small>{p.request ? "친구 요청이 도착했어요" : p.status}</small>
        <small className="green">
          {p.request ? "친구 요청 수락 ›" : "정원 방문 ›"}
        </small>
      </span>
    </button>
  );
}
type FriendGarden = {
  name: string;
  character: string;
  garden: UserState["garden"];
  todayChallengeSucceeded: boolean;
  challengeSuccessCount: number;
};
export function Social() {
  const a = useApp(),
    [people, setPeople] = useState<Person[]>([]),
    [deleting, setDeleting] = useState<Person | null>(null),
    [friendError, setFriendError] = useState(false),
    [adding, setAdding] = useState(false),
    [code, setCode] = useState(
      sessionStorage.getItem("aimi.pending-invite") ??
        new URLSearchParams(location.search).get("invite") ??
        "",
    ),
    [friend, setFriend] = useState<FriendGarden | null>(null);
  useEffect(() => {
    if (sessionStorage.getItem("aimi.pending-invite")) {
      setAdding(true);
      sessionStorage.removeItem("aimi.pending-invite");
    }
  }, []);
  const reload = () =>
    request<{ people: Person[] }>("/v1/social").then((r) =>
      setPeople(r.people),
    );
  useEffect(() => {
    void reload().catch(() => {});
  }, [a.data]);
  useEffect(() => {
    let cancelled = false;
    setFriend(null);
    setFriendError(false);
    if (a.path.startsWith("/friends/"))
      void a
        .perform(
          () =>
            request<FriendGarden>(
              "/v1/friends/" + a.path.split("/")[2] + "/garden",
            ),
          undefined,
          "none",
        )
        .then((result) => {
          if (cancelled) return;
          if (result) setFriend(result);
          else setFriendError(true);
        });
    return () => {
      cancelled = true;
    };
  }, [a.path]);
  const action = (kind: string, p: Person) =>
    a
      .perform(() =>
        request("/v1/social/actions", "POST", { action: kind, code: p.code }),
      )
      .then((result) => {
        if (result) {
          setDeleting(null);
        }
      });
  if (a.path.startsWith("/friends/"))
    return friend ? (
      <>
        <GardenScene
          character={friend.character}
          garden={friend.garden}
          catalog={a.content!.catalog}
        />
        <Notice title={friend.name + "의 정원"}>
          <Stats
            rows={[
              [
                "오늘 챌린지",
                typeof friend.todayChallengeSucceeded === "boolean"
                  ? friend.todayChallengeSucceeded
                    ? "성공"
                    : "미성공"
                  : "확인할 수 없어요",
              ],
              [
                "누적 성공",
                typeof friend.challengeSuccessCount === "number"
                  ? friend.challengeSuccessCount.toLocaleString("ko-KR") + "회"
                  : "확인할 수 없어요",
              ],
            ]}
          />
        </Notice>
        <p className="caption">방문 중에는 아이템과 캐릭터를 바꿀 수 없어요.</p>
        <Button onClick={() => a.navigate("/social")}>친구 목록으로</Button>
      </>
    ) : (
      <>
        <p role="status">
          {friendError
            ? "정원을 불러오지 못했어요. 친구 관계를 확인해주세요."
            : "정원을 불러오고 있어요."}
        </p>
        {friendError && (
          <Button onClick={() => a.navigate("/social")}>친구 목록으로</Button>
        )}
      </>
    );
  return (
    <>
      <h2>친구들과 함께</h2>
      <section className="social-identity" aria-label="내 소셜 정보">
        <strong>{a.data!.name}</strong>
        <p>
          내 친구 코드 <b>{a.data!.code}</b>
        </p>
        <Button onClick={() => setAdding(true)}>친구 추가하기</Button>
        <div className="social-share-actions">
          <button
            className="text-link"
            onClick={() =>
              void a.perform(
                () => copy(a.data!.code),
                "코드를 복사했어요.",
                "none",
              )
            }
          >
            내 코드 복사
          </button>
          <button
            className="text-link"
            onClick={() =>
              void a.perform(
                () => invite(a.data!.code),
                "초대 링크를 준비했어요.",
                "none",
              )
            }
          >
            친구 초대
          </button>
        </div>
      </section>
      <p className="caption">
        친구 코드를 입력하고, 상대가 요청을 수락하면 서로의 정원을 볼 수 있어요.
      </p>
      <p className="caption" id="friend-long-press-help">
        친구를 꾹 누르면 삭제할 수 있어요.
      </p>
      <div className="friend-list section">
        {people.map((p) => (
          <article className="friend-card" key={p.id}>
            <FriendVisitButton
              person={p}
              disabled={a.busy}
              onVisit={() => {
                if (p.request) void action("accept", p);
                else a.navigate("/friends/" + p.id);
              }}
              onDelete={() => setDeleting(p)}
            />
          </article>
        ))}
      </div>
      {import.meta.env.DEV &&
        localStorage.getItem("aimi.session")?.startsWith("dev-") && (
          <button
            className="text-button caption"
            disabled={a.busy}
            onClick={() =>
              void a
                .perform(
                  () => request("/dev/social/restore", "POST", {}),
                  "예시 친구를 복구했어요.",
                )
                .then((result) => {
                  if (result) void reload();
                })
            }
          >
            테스트 친구 복구
          </button>
        )}
      {deleting && (
        <Modal
          title="친구를 삭제하시겠어요?"
          onClose={() => {
            setDeleting(null);
          }}
        >
          <p>{deleting.name}님을 친구 목록에서 삭제해요.</p>
          <div className="dialog-actions">
            <Button weak onClick={() => setDeleting(null)}>
              닫기
            </Button>
            <Button
              loading={a.busy}
              onClick={() => void action("remove", deleting)}
            >
              삭제
            </Button>
          </div>
        </Modal>
      )}
      {!people.length && (
        <p className="muted">
          친구 코드를 입력하거나 초대 링크를 공유해보세요.
        </p>
      )}
      {adding && (
        <Modal
          title="코드로 친구 추가"
          onClose={() => {
            setAdding(false);
          }}
        >
          <label>
            친구 코드
            <input
              value={code}
              maxLength={8}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8자리 코드를 입력해주세요"
            />
          </label>
          <div className="dialog-actions">
            <Button
              disabled={!/^[A-F0-9]{8}$/.test(code)}
              loading={a.busy}
              onClick={() =>
                void a
                  .perform(
                    () =>
                      request("/v1/social/actions", "POST", {
                        action: "request",
                        code,
                      }),
                    "친구 요청을 보냈어요.",
                  )
                  .then((r) => {
                    if (r) setAdding(false);
                  })
              }
            >
              친구 요청 보내기
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Account() {
  const a = useApp(),
    [confirm, setConfirm] = useState(false);
  return (
    <>
      <h2>내 계정</h2>
      <Notice title={a.data!.name}>친구 코드 {a.data!.code}</Notice>
      <details className="nickname-edit">
        <summary>닉네임 변경</summary>
        <NicknameForm />
      </details>
      <Button weak onClick={() => a.navigate("/privacy")}>
        개인정보처리방침
      </Button>
      <SupportContact />
      <Button
        weak
        onClick={() =>
          void a
            .perform(
              () => request("/auth/logout", "POST", {}),
              undefined,
              "none",
            )
            .then(() => {
              setToken(null);
              location.href = "/";
            })
        }
      >
        로그아웃
      </Button>
      <Button weak onClick={() => setConfirm(true)}>
        계정 삭제
      </Button>
      {confirm && (
        <Modal
          title="계정을 삭제할까요?"
          onClose={() => {
            setConfirm(false);
          }}
        >
          <p>
            정원과 보유품, 기록을 삭제해요.
            <br />이 작업은 되돌릴 수 없어요.
          </p>
          <div className="dialog-actions">
            <Button weak onClick={() => setConfirm(false)}>
              닫기
            </Button>
            <Button
              onClick={() =>
                void a
                  .perform(
                    () => request("/v1/account", "DELETE"),
                    undefined,
                    "none",
                  )
                  .then((r) => {
                    if (r) {
                      setToken(null);
                      location.href = "/";
                    }
                  })
              }
            >
              삭제하기
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
