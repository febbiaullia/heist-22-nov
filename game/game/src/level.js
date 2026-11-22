// The museum: one big gallery, three ways through it. Every rectangle here blocks
// movement and blocks sight — a guard's or camera's cone stops at a wall or a case,
// so the routes are the cover. Coordinates are in the 1280x720 logical field.
//
// Routes: the open main hall down the middle (fast, watched), the left wing behind the
// tall cases (slow, quiet), and the narrow top corridor behind the long case (a short
// cut straight to the vault, swept by the vault camera).

export const LEVEL = {
  /** Where the thief walks in. */
  entry: { x: 100, y: 620 },
  /** The vault door on the top wall; crack it standing in front of it. */
  vault: { x: 1110, y: 78, w: 120, h: 40 },
  /** The getaway door in the bottom wall; it opens once the loot is taken. */
  exit: { x: 1190, y: 648 },
  /** Cover: display cases, crates, a statue, a bench and a column. */
  obstacles: [
    { x: 280, y: 140, w: 200, h: 56, kind: 'case', label: 'Jewels' },
    { x: 280, y: 460, w: 200, h: 56, kind: 'case', label: 'Relics' },
    { x: 620, y: 300, w: 56, h: 56, kind: 'statue', label: '' },
    { x: 860, y: 470, w: 150, h: 64, kind: 'crates', label: '' },
    { x: 560, y: 110, w: 220, h: 48, kind: 'case', label: 'Crowns' },
    { x: 1010, y: 250, w: 130, h: 36, kind: 'bench', label: '' },
    { x: 1000, y: 520, w: 160, h: 48, kind: 'case', label: 'Masks' },
    { x: 180, y: 320, w: 48, h: 48, kind: 'column', label: '' },
  ],
  /** Small loot, worth a detour. */
  gems: [
    { x: 190, y: 170 },
    { x: 700, y: 620 },
    { x: 920, y: 140 },
  ],
  guards: [
    {
      name: 'Rocco',
      // The JEWELS wing, top-left: the bottom of the wing is the entry side and
      // stays open, so a careful thief can slip in along the west wall.
      waypoints: [
        { x: 140, y: 140 },
        { x: 240, y: 140 },
        { x: 240, y: 300 },
        { x: 140, y: 300 },
      ],
    },
    {
      name: 'Mira',
      waypoints: [
        { x: 480, y: 200 },
        { x: 820, y: 200 },
        { x: 820, y: 520 },
        { x: 480, y: 520 },
      ],
    },
    {
      name: 'Vince',
      waypoints: [
        { x: 940, y: 120 },
        { x: 1180, y: 120 },
        { x: 1180, y: 360 },
        { x: 940, y: 360 },
      ],
    },
  ],
  cameras: [
    // Above the vault approach, sweeping down across the top corridor.
    { x: 1010, y: 26, baseAngle: Math.PI / 2, phase: 0 },
    // On the right wall, sweeping the exit corridor.
    { x: 1254, y: 420, baseAngle: Math.PI, phase: 1.7 },
  ],
};
