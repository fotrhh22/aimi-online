-- User-approved EP policy: attendance3 + tip1 + games20 + challenge15 =39/day.
-- Historical wallets, claims and ledger entries are not reset or repriced.
INSERT INTO aimi.reward_policies(version, attendance, tip, development_only)
VALUES ('aimi-economy-v2', 3, 1, false)
ON CONFLICT (version) DO NOTHING;
