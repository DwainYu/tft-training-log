# Set 18 Static Data

Local static snapshot of TFT Set 18 ("Enchanted Wilds") for the training log.
No runtime network access is needed — the app bundles these files.

## Provenance

| | |
|---|---|
| Dataset | TFT Set 18 ("Enchanted Wilds") |
| Set number | 18 |
| Patch version | 18.3 (released 2026-09-22) |
| Locale | zh-CN (names + descriptions; apiNames are locale-independent ids) |
| Source | [Riot Data Dragon, mirrored by CommunityDragon](https://raw.communitydragon.org/16.19/cdragon/tft/zh_cn.json) |
| DDragon bundle | 16.19 (`sha256` of the fetched file is recorded in `manifest.json`) |
| Retrieved / generated | 2026-09-24 |
| Schema version | 1 (`manifest.schemaVersion`) |
| Data version | `s18-18.3-ddragon-16.19` |

The snapshot is **generated**, not hand-maintained:

```bash
node scripts/build-set18-data.mjs   # rewrites this directory from the pinned URL
```

## Files

| File | Content | Count |
|---|---|---|
| `manifest.json` | set / version / locale / source / counts | – |
| `champions.json` | shop champions (cost 1–5 with traits) | 65 |
| `traits.json` | set traits + effect breakpoints | 36 |
| `items.json` | equippable gear, categorized | 186 |
| `augments.json` | full set 18 augment pool (incl. carried-over augments) | 592 |

### Schemas (v1)

```ts
ChampionData {
  id: string            // apiName, locale-stable
  name: string
  cost: 1 | 2 | 3 | 4 | 5
  traits: string[]      // ids of entries in traits.json
  set: 18
  role?: string
  stats?: { hp, attack, armor, magicResist, attackSpeed, range, critChance, critMultiplier, initialMana }
  ability?: { name, description }
  icon?: string         // CommunityDragon asset path (.tex)
}

TraitData    { id, name, set, breakpoints: number[], description, icon? }
ItemData     { id, name, category, set, description, composition?: string[], icon? }
             // category: component | completed | radiant | artifact | support | emblem | other
AugmentData  { id, name, set, description, icon? }
```

## Classification rules (items)

Derived from the source's own fields (see `scripts/build-set18-data.mjs`):
`radiant` by apiName suffix, `artifact` (Ornn / Shimmerscale / `Artifact` in
apiName), `support`, `completed` (2-part composition), `component`
(component tag / shop-able component parts), `emblem` (set 18 trait items
granted by Wisps), else `other` (single support-style items).

## Known limitations (documented, not fabricated)

- **Champions**: 9 Lux form variants (`DA_18_Lux_*`, e.g. 拉克丝 (黑荆棘))
  exist in the source and are excluded from the base roster on purpose.
  Encounter-only units (cost 8/11 such as 纹章之书 / 赏金猎人宝箱) are not
  shop champions and are excluded.
- **Augment tiers** (silver / gold / prismatic) are not reliably encoded in
  the source, so no `tier` field is written.
- **Descriptions** keep the raw game template (`@Gold@`, `%i:scaleAP%`…) —
  they are reference text, not rendered game UI.
- **Icons** are CommunityDragon asset paths (`.tex`), not bundled images.
  Resolvable on demand as `https://raw.communitydragon.org/latest/game/<path>.tex`
  → replace `.tex` with `.png`. Nothing in the repo downloads them.
- The augment pool (592) includes carried-over augments from earlier sets —
  that is exactly what Riot publishes as the set 18 pool.
