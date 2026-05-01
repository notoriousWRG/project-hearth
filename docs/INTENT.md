# 🏠 Hearth — Home Planner App: Intent Document

**Status:** Draft v1.0 | April 2026

**Audience:** Cowork / implementation agent

**Purpose:** Define intent, scope, architecture, and design constraints for a self-hosted family dashboard app called *Hearth*.

---

# Overview

Hearth is a self-hosted home planner and chore tracker built for a homesteading family of five in Marietta, GA. It runs on a Mac Mini server and is accessible over the home network via browser — primarily on the Mac Mini itself and a Pixel tablet. It replaces a patchwork of Notion pages, paper lists, and mental load with a single calm, purposeful interface that the whole family can use.

The app has two modes - depending on what view is selected:

- **Parent view** — full-access dashboard with todo lists, daily recurring tasks, meal plan, grocery list, reminders, and settings.
- **Child view** — chore tracker and allowance progress for two school-aged daughters (one reader, one pre-reader).

The governing design principle: **screens are tools, not destinations.** The interface should be calm, clear, and quick to use — nothing addictive, gamified beyond what serves habit formation, or visually noisy.

The name is *Hearth*.

---

# Technical Architecture

## Stack

- **Backend:** Node.js (Express) or lightweight Python (FastAPI) — whichever offers better long-term maintainability. Persistent state via JSON files or SQLite (SQLite preferred for query flexibility and durability).
- **Frontend:** Single-page app served from the Mac Mini. Vanilla JS + HTML/CSS is acceptable; React is acceptable if the UI complexity warrants it. Keep dependencies minimal.
- **Network access:** LAN only. No external hosting, no cloud dependency. Accessible from any device on the home network via local IP or mDNS hostname (e.g., `hearth.local`).
- **Primary devices:** Mac Mini (host, secondary display) and Pixel tablet (primary display, mobile access on the same network).

## Data Persistence

- SQLite database stored locally on the Mac Mini.
- All app state (chores, todos, meal plan, grocery list, allowance config, theme settings, child progress) lives in this database.
- No authentication required for regular use. A 4-digit PIN protects the Settings tab for parents.

## No External Dependencies at Runtime

- No push notifications.
- No cloud sync.
- No third-party APIs required.
- Meal plan → grocery list connection is internal logic only.

---

# User Model

## User Types

| Type | Users | Access |
| --- | --- | --- |
| Parent | WR, Scales | Full app + PIN-protected settings |
| Child | Kraft (Grade 2 - reader), Golden (pre-reader) | Child view only |

## Navigation Model

- App opens to a **home screen** showing the current active user or a user selector.
- A persistent user selector (icon-based, top of screen) lets you switch between WR, Scales, and either child's view without a password.
- Settings tab requires PIN entry. PIN is set during initial setup.

---

# Feature Set

## Phase 1 (Build First)

### Parent Dashboard

**Daily Overview**

- Date, day of week, and a brief contextual summary (e.g., upcoming items today).
- No weather widget, no external data — keep it local.

**Todo List**

- Add, edit, reorder, delete tasks.
- Tasks can be one-time or recurring (daily, weekly, specific days of week, or custom interval).
- Recurring tasks reset automatically at the configured interval.
- Tasks can be marked complete; completed tasks move to bottom or collapse.
- No subtasks in Phase 1.

**Daily Chores (Parent)**

- Separate from todo list. These are the household maintenance items that belong to WR and Scales.
- Same CRUD model: add, edit, reorder, delete, one-time or recurring.
- Displayed on the parent dashboard with daily completion tracking.

**Meal Plan**

- Weekly view (Mon–Sun).
- Each day has: Breakfast, Lunch, Dinner, and optionally Snack.
- Click a day/meal to add or edit a meal entry (free text, no recipe database in Phase 1).
- "Generate grocery list" button reads all meals in the current week and populates the grocery list with ingredients (parent manually enters/confirms ingredients — no AI parsing in Phase 1).

**Grocery List**

- Add items manually or receive them from the meal plan flow.
- Categorized by section (Produce, Protein, Pantry, Dairy, Household, Other) — parent assigns category on add.
- Check items off while shopping; a "Clear checked" button removes completed items.
- Persistent across sessions.
- Option to “Export list” to notion or some other form to access at the store in Phase 2

**Reminders**

- Simple list of upcoming reminders with a date.
- No push notifications — displayed on the home screen when a reminder is due that day.
- Add, edit, delete. Mark as dismissed.

### Child View — Chore & Allowance Tracker

**Chore List**

- Each child has their own chore list, configured by parents in Settings.
- Chores can be one-time or recurring (same model as parent).
- Chores can have a bonus flag (⭐) — bonus chores award extra when completed.
- Chores display with a large icon and short label (icon is primary; text is secondary).
- Tap to mark complete. Visual celebration on completion (simple, non-addictive — e.g., a brief color pulse or a small icon animation).

**Allowance Progress**

- Configured in Settings by parents:
    - Total allowance amount (dollar value).
    - Tiered completion thresholds: e.g., 50% of chores = 50% of allowance, 75% = 75%, 100% = 100%.
    - Bonus amount attached to specific bonus chores (added on top of tier).
- Child view shows a simple progress indicator: how many chores done, current tier reached, current earned amount.
- Streaks: if a child completes all their chores every day for N days, a streak counter increments and a visual badge appears. Streak thresholds and bonuses configurable in Settings.

**Chore Completion Model**

- Child self-reports (tap to complete). No parent approval required in Phase 1.
- Reset logic: recurring chores reset at the start of each day (midnight) or at a configurable reset time.

**Allowance Summary**

- Tracks accumulated earnings across the week (or configurable period).
- Parents can mark allowance as "paid" in Settings, which resets the earned balance.

### Settings (PIN-Protected)

- **Chore management:** Add, edit, reorder, delete chores per child. Set recurring schedule. Set bonus flag and bonus amount.
- **Allowance config:** Set allowance amount, tier thresholds, streak bonuses per child.
- **Theme selector:** Choose theme per view (parent and child views can differ).
- **PIN management:** Change PIN.
- **Allowance payout:** Mark current period as paid (resets balance).
- **Meal plan / grocery:** No special settings needed in Phase 1.

---

## Phase 2 (Planned, Not Built Now)

- Recipe database with auto-parsing of ingredients into grocery list.
- “Export Grocery List” option to text, notion, or some persistent source for use at the store
- Adding a category of “Helper” chores, tasks that or not obligatory but rewarded when they are done without asking (e.g. clearing out the car, putting shoes away, cleaning the bathroom, being kind to siblings, etc)
- Seasonal/liturgical calendar integration (Advent, Lent, farm seasons — relevant to how this family structures time).
- Shared family announcements or message board (simple, no chat).
- Print view for weekly schedule.

---

# Design System

## Themes

Three preset themes, selectable per view (parent and child independently):

| Theme | Aesthetic | Best For |
| --- | --- | --- |
| **Clean** | Minimal, neutral tones, sans-serif, generous whitespace | Parent focus mode |
| **Farmstead** | Warm earth tones, soft textures, slight hand-drawn feel | Parent, cozy |
| **Whimsy** | Bright color palette, rounded shapes, playful icons | Children's view (default) |

All themes must:

- Be readable in bright ambient light (tablet on counter).
- Use sufficient contrast for accessibility.
- Load quickly — no heavy animations.

## Children's UI Rules

- **Text size:** Minimum 20px for labels; interactive targets minimum 48px.
- **Icons first:** Every chore, every action has an icon. Text is secondary.
- **Simple language:** Short words, present tense. "Feed the chickens," not "Complete poultry care task."
- **Whimsy theme default:** Always loads with Whimsy unless parent changes it.
- **No complexity visible:** No settings, no numbers they don't need, no allowance math — just chores, progress bar, and earned amount in large friendly text.
- **Tap targets:** Generous. Pre-reader (Golden) should be able to operate her view without assistance.

## Parent UI Rules

- Functional over decorative.
- No dark patterns. No badges that demand attention. No red notification dots.
- Dense enough to be useful at a glance, not so dense it requires parsing.
- All actions (add, edit, delete) accessible within 2 taps.

---

# Identity-Informed Design Notes

*These are drawn from the family identity doc and should inform UX decisions throughout build.*

- **Scales operates in a high-interruption environment.** The app must be fast to pick up and put down. No modal flows that trap you mid-task. State saves automatically.
- **WR thinks in systems.** The recurring task and chore infrastructure should be robust and flexible from the start — it will be built on, not replaced.
- **The children learn through rhythm and ritual, not reward mechanics.** Keep gamification honest: streaks reward showing up, not gaming the system. Completion animations should feel like a small "well done," not a dopamine loop.
- **The bottom line is relationship.** The app should help the family function together — not replace interaction, not automate connection. Keep it as a quiet background tool, not a centerpiece.
- **Faith and seasonality matter.** Phase 2 should include a liturgical/seasonal rhythm view. Leave schema room for it.
- **Simplicity is the point.** Every feature added increases the chance this stops being used. Default to less.

---

# Non-Goals

- No cloud hosting or remote access outside home network.
- No social features, no sharing.
- No AI-generated content in the app itself.
- No advertisement, tracking, or analytics.
- No user accounts, passwords, or email.
- No mobile app — browser-based only, responsive for tablet.

---

# Open Questions for Implementation

1. **Reset time for recurring chores** — midnight, or a configurable "start of day" time? 
    1. configurable in Settings, default midnight
2. **Streak definition** — does a streak require *all* chores complete, or a configurable threshold? 
    1. configurable per child
3. **Grocery list persistence** — does the list persist until manually cleared, or does it clear on a weekly cycle tied to the meal plan? 
    1. manual clear, with a "eat fresh" button
4. **Chore icon set** — needs a curated set of household/homestead icons. Recommend using a single open-source icon set (e.g., Phosphor or Lucide) with homestead-friendly additions. Parent should be able to assign icon per chore from the set.
    1. I don’t have a refernce for this, we’ll start with whatever well-supported icon set claude finds fits the need
5. **Pixel Tablet display mode** — if the tablet is used as a persistent display (always-on browser), what user/view should it default to? 
    1. a family summary page (progress status for all users, reminders, announcements, affirmations, etc) 

---

# Deliverables Expected from Implementation Agent

- [ ]  Project scaffold (repo structure, dependencies, README)
- [ ]  Database schema (SQLite)
- [ ]  Backend API routes
- [ ]  Frontend component breakdown
- [ ]  Theme system implementation
- [ ]  Chore + allowance logic
- [ ]  Meal plan ↔ grocery list connection
- [ ]  Settings panel with PIN protection
- [ ]  Child view with icon-first UI
- [ ]  Deployment instructions for Mac Mini (local server, auto-start on boot)