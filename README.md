[![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/febbiaullia/heist-22-nov/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/febbiaullia/heist-22-nov/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# Velvet Vault — Midnight Heist

A top-down 2D stealth game: slip through a museum gallery past three patrolling guards and two sweeping security cameras, crack the vault, grab the gems, and reach the exit before the alarm hits 100%. Smoke bombs and an EMP help — each one costs score. Runs fully offline in any desktop browser; all art is drawn in code, all sound is synthesized with WebAudio.

## How to play

- **Move:** WASD or arrow keys — **Sneak:** hold Shift (slower, harder to spot)
- **Crack the vault:** stand by it and hold E (2 seconds)
- **Tools:** 1 = smoke bomb (blinds vision cones), 2 = EMP (disables a camera for 10 s), Space or click = use the selected tool
- **Pause:** P or Esc · **Mute:** M · **Start / restart:** Enter

Three guards patrol the gallery with vision cones — being seen raises the alarm (+30/s), hiding lets it fall. Cameras sweep their cones and raise it faster (+40/s). At 100% the alarm busts you; at 70% or more the guards hunt the last place they saw you. Get caught by touch and the run ends. Grab the vault (500 points) and the gems (100 each), then reach the exit — a time bonus rewards a clean, fast getaway.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
