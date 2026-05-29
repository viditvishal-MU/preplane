## Goal

Closing Date should be set automatically the day the LMP status is changed to one of the **closing** statuses, and cleared automatically when status moves away from those. This must reflect in the DB column `lmp_processes.closing_date` and in the synced sheet column W (Closing Date).

## Closing vs Open statuses

Based on the status dropdown in the screenshot:

- **Closing statuses (sets closing_date = today, IST):**
  - `converted` (Converted)
  - `not-converted` (Not Converted)
  - `other-reasons` (Other reasons)
- **Open statuses (clears closing_date):**
  - `not-started` (Not Started)
  - `prep-ongoing` (Prep Ongoing)
  - `prep-done` (Prep Done)
  - `hold` / `on-hold` (On hold)

Note: today the trigger also treats On hold / Dormant / Closed as closing — that will be removed so only the three above set a closing date.

## Changes

### 1. Replace the closing-date trigger (migration)

Rewrite `public.tg_lmp_set_closing_date` so:

- The `closing_states` array contains only the closing variants:
  `'converted', 'not-converted', 'not_converted', 'other-reasons', 'other_reasons', 'Converted', 'Not Converted', 'Other reasons', 'Other Reasons'`.
- On INSERT or UPDATE, if `NEW.status` is a closing state and the row entered that state (status changed, or no valid date present), set `closing_date := today (Asia/Kolkata, YYYY-MM-DD)`.
- On UPDATE, if `NEW.status` is NOT a closing state and the status actually changed, set `closing_date := NULL` (always clear — even if it was edited manually before), so re-opening an LMP wipes the date in DB and downstream sheet sync.
- Keep `BEFORE INSERT OR UPDATE OF status, closing_date` trigger binding.

### 2. Backfill existing rows

In the same migration:

- For rows whose current `status` is one of the three closing statuses and `closing_date` is empty or malformed, set it from `updated_at` (IST date).
- For rows whose current `status` is an open status (`not-started`, `prep-ongoing`, `prep-done`, `hold`, `on-hold`) and `closing_date` is non-null, set `closing_date = NULL`.

### 3. Sheet sync

No code change needed — `closing_date` is already in the writable column allow-list and mapped to sheet column W ("Closing Date"). Trigger updates flow through the existing `lmp_processes` → sheet write path.

### 4. Frontend

No change. UI already reads `closing_date` from `lmp_processes`. The selected `<th>Closing Date</th>` column in `ViewAllLmpsModal.tsx` will reflect the new value automatically.

## Acceptance

- Setting status to Converted / Not Converted / Other reasons on day X → `closing_date = X` in DB and sheet column W.
- Then changing status to Prep Done / Prep Ongoing / Not Started / On hold → `closing_date` becomes empty in DB and sheet column W.
- Existing rows are reconciled by the backfill.
