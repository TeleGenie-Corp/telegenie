---
trigger: always_on
---

# Post Pipeline: The Algorithm of Power

This document defines the strict 6-step business process for generating
high-impact Telegram content within TeleGenie.

## 1. Context & Intelligence (Architect)

**Objective**: Define the strategic angle.

- **Input**: Channel analysis metrics, User intent (Goal/Format), External
  Context (News/Trends).
- **Action**: Analyze "What currently works" vs "What is needed".
- **Output**: `Strategy` object (Targeting, Tone, Constraints).

## 2. Ideation (Divergence)

**Objective**: Generate strategic options.

- **Input**: `Strategy`.
- **Action**: Generate 3-6 distinct angles or hooks (not just titles, but
  concepts).
- **Output**: List of `Idea` objects (Title, Description, Sources).

## 3. Drafting (Synthesis)

**Objective**: Create the core content.

- **Input**: Selected `Idea`.
- **Action**: Write the post text using specific Tone of Voice and persuasive
  structure.
- **Output**: Draft Text.

## 4. Packaging (Visuals & Format)

**Objective**: Maximize perceived value ("Make it look easy").

- **Input**: Draft Text + Visual Association.
- **Action**:
  - **Visuals**: Upload or Generate premium imagery (Avoid generic stock
    styles).
  - **Formatting**: Apply Telegram semantics (Bold, Italic, Spoilers, Links).
- **Output**: `Post` object (Text + ImageBlob/URL).

## 5. Polishing (Refinement)

**Objective**: Eliminate weakness.

- **Input**: `Post` object.
- **Action**: Manual review and edit by the user in the "Workshop" (Editor).
- **Output**: Approved `Post`.

## 6. Distribution (Dominance)

**Objective**: Publish and capture attention.

- **Input**: Approved `Post`.
- **Action**: Send to Telegram Bot API.
- **Output**: Published Message (MessageID, ViewCount).
