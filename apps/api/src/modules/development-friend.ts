import { clampGardenPlacement, seoulDate } from "@aimi/contracts";
import type { Repository } from "./repository.js";
import { daily } from "./domain.js";
export const DEVELOPMENT_FRIEND_ID = "dev-garden-preview";
/** Explicit local login fixture only. Never called by Toss or production auth. */
export async function seedDevelopmentFriend(
  repo: Repository,
  userId: string,
  restore = false,
) {
  if (
    !repo.development ||
    process.env.NODE_ENV === "production" ||
    process.env.RENDER
  )
    return;
  await repo.transaction([userId, DEVELOPMENT_FRIEND_ID], (states) => {
    const me = states[userId],
      friend = states[DEVELOPMENT_FRIEND_ID];
    if (me.claims["_dev-social-v1"] && !restore) return;
    if (restore) {
      me.blocked = me.blocked.filter((id) => id !== DEVELOPMENT_FRIEND_ID);
      friend.blocked = friend.blocked.filter((id) => id !== userId);
    }
    me.claims["_dev-social-v1"] = [DEVELOPMENT_FRIEND_ID];
    friend.name = "모모 · 테스트 친구";
    friend.selectedCharacter = "fox";
    friend.inventory = [
      "seed",
      "fox",
      "apple-tree",
      "carrot-bed",
      "mushroom-patch",
      "garden-lamp",
      "wood-sign",
    ];
    friend.garden = {
      public: true,
      revision: friend.garden.revision + 1,
      slots: {},
      placements: [
        { itemId: "apple-tree", instanceId: "demo-tree", x: 0.22, y: 0.54 },
        { itemId: "wood-sign", instanceId: "demo-sign", x: 0.77, y: 0.46 },
        { itemId: "carrot-bed", instanceId: "demo-carrots", x: 0.26, y: 0.88 },
        {
          itemId: "mushroom-patch",
          instanceId: "demo-mushrooms",
          x: 0.77,
          y: 0.87,
        },
        { itemId: "garden-lamp", instanceId: "demo-lamp", x: 0.83, y: 0.7 },
      ].map(clampGardenPlacement),
    };
    const day = daily(friend, seoulDate());
    day.success = true; // Clearly named demonstration profile; no reward is issued.
    if (!me.friends.includes(DEVELOPMENT_FRIEND_ID))
      me.friends.push(DEVELOPMENT_FRIEND_ID);
    if (!friend.friends.includes(userId)) friend.friends.push(userId);
  });
}
