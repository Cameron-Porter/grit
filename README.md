# G.R.I.T.

**Guided Results & Intelligent Training**

A mobile fitness application built for lifters who want structured, progressive training without unnecessary complexity. G.R.I.T. combines evidence-based hypertrophy principles with a rules-based program generation engine to deliver personalized training plans, real-time workout logging, and long-term progress tracking — all in a clean, native mobile experience.

---

## What's Built

G.R.I.T. is a fully functional React Native application targeting iOS and Android. The following features are production-ready:

### Workout Logging
- Start a Quick Workout (unplanned session) or launch directly from a program day
- Log sets with weight, reps, and RIR (Reps in Reserve)
- Swipe right to complete a set, swipe left to remove it
- Auto-fill target reps when completing non-RIR sets
- Haptic feedback on set completion and deletion
- Progress bar tracking completed vs. total sets for the session
- Minimum exercise enforcement with in-session add prompt
- Skip Workout option with confirmation
- Per-exercise notes
- Active set highlighted with a distinct checkbox border

### Session Feedback
- Feedback modal auto-triggers per muscle group as soon as all its sets are complete
- Rates joint pain, pump, and volume adequacy independently per muscle group
- Soreness check-in the day after training each muscle group
- All feedback flushed to `workout_feedback` on session save for long-term coaching data

### Program Builder
- Multi-step wizard: name → duration → days/week → training days → experience level → focus → muscle priorities → per-day exercise selection
- Configurable program length (2–8 weeks), frequency (2–6 days/week), and training day selection
- Five focus modes: Hypertrophy, Strength, Powerbuilding, General Fitness, Maintenance
- Per-muscle priority settings: Emphasize / Grow / Maintain
- Auto-generates all program days and populates week-over-week structure on save
- After creation, immediately loads the first workout

### Rules-Based Training Engine

The program builder is backed by a deterministic rules engine that mirrors established hypertrophy methodology:

| Module | Responsibility |
|---|---|
| `splitDeriver` | Selects optimal training split (PPL, Upper/Lower, Full Body, etc.) based on frequency and priorities |
| `volumeBudget` | Calculates per-muscle weekly set targets by focus and priority using MEV/MAV doctrine |
| `assignment` | Distributes muscles across training days according to split and recovery constraints |
| `slotBuilder` | Builds per-session exercise slots (Primary / Secondary / Accessory) with set/rep/RIR prescriptions |
| `exerciseRecommender` | Ranks exercises by SFR (Stimulus-to-Fatigue Ratio) tier and equipment preference |
| `progressionEngine` | Calculates week-over-week load and intensity progressions with deload week support |
| `validation` | Enforces program structural integrity before saving |

Weekly volume scales from 70% in Week 1 to 100% at peak, with RIR decreasing by one each week for actively trained muscles. Deload weeks automatically apply 50% volume at RIR 4.

### Exercise Library
- 200+ exercises seeded in Supabase, covering all major muscle groups
- Per-exercise metadata: muscle group, equipment, SFR tier, movement pattern, fatigue cost
- Equipment-preference filtering (Barbell, Dumbbell, Cable, Machine, Bodyweight, etc.)
- Inline search within the exercise picker
- Create custom exercises saved directly to the database
- Star indicator for top-recommended exercises per slot

### Personal Records
- Automatically tracked per exercise across all workout sessions
- Dedicated tab with trophy-icon listing and date achieved
- Manual PR entry for historical lifts

### Workout History
- Full log of completed sessions
- Per-session exercise and set detail

### Programs List
- Three-state status badge per program: **Active** (currently selected), **Paused** (started but incomplete), **Complete** (all days finished or skipped)
- Day completion progress displayed inline (`X/Y days done`)
- Resume, set as current, or delete from the context menu
- Creating a new program automatically deactivates all others

### Profile & Settings
- Body weight logging (90-day history) with auto-match to bodyweight exercises
- Equipment preference selection filters exercise recommendations
- Experience level (Beginner / Intermediate / Advanced)
- Light and dark theme support
- Data export (ZIP of workout history as CSV, shareable via system sheet)
- Account management and sign-out

### Subscription (GRIT Pro)
- Free 7-day trial via RevenueCat
- Pro paywall on advanced program generation features
- Admin/VIP pre-grant access bypasses paywall
- Subscription status visible in profile with trial countdown

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) 56 (React Native 0.85, React 19) |
| Language | TypeScript |
| Navigation | [Expo Router](https://expo.github.io/router) v56 (file-based, typed routes) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs) v5 with persist middleware |
| Backend | [Supabase](https://supabase.com) (PostgreSQL, Auth, Row Level Security) |
| Monetization | [RevenueCat](https://www.revenuecat.com) (`react-native-purchases`) |
| Error Monitoring | [Sentry](https://sentry.io) (`@sentry/react-native`) |
| Animations | React Native Reanimated v4 |
| Gestures | React Native Gesture Handler v2 |
| Charts | React Native SVG v15 |
| Haptics | Expo Haptics |

---

## Design Principles

**Simplicity over features.** A user should be able to start a workout in under three taps.

**Evidence-based defaults.** Volume targets, RIR progressions, and split recommendations follow established hypertrophy research (MEV/MAV doctrine, SFR ranking, progressive overload).

**One source of truth.** The exercise library lives in Supabase. Local data (`exerciseDatabase.ts`) exists only to support the scoring engine with metadata not suited for a relational schema.

**No magic.** The program generation engine is fully deterministic and auditable. Every slot, set count, and RIR value is traceable to a specific rule.

---

## Roadmap

- [ ] AI-assisted coaching notes and rationale per workout
- [ ] Apple Health / Google Fit integration
- [ ] Wearable heart rate and recovery data
- [ ] Advanced analytics dashboard (volume heatmaps, strength curves)
- [ ] Social accountability features
- [ ] Nutrition and body composition tracking

---

## License

Private repository. All rights reserved.
