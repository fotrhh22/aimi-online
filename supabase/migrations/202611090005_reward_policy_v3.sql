-- Coin collection policy: attendance3 + tip1 + games15 + challenge15 =34/day.
INSERT INTO aimi.reward_policies(version, attendance, tip, development_only)
VALUES ('aimi-economy-v3', 3, 1, false)
ON CONFLICT (version) DO NOTHING;
