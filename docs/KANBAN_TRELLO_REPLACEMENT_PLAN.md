# Trello-like Kanban Board Replacement — Plan

**Note:** The task, milestone, and kanban workflow and data have been removed from the application. This document is kept for historical reference only.

## Current state (at time of writing)

- **Task Kanban**: `components/ctms/tasks/task-kanban-board.tsx` — fixed 4 columns (To Do, In Progress, Review, Done); status changed via **Select dropdown**, no drag-and-drop. Used on `app/protected/tasks/page.tsx` (TaskList) and in `components/ctms/milestones/tasks-panel.tsx` (study-level tasks).
- **Milestone Kanban**: `components/ctms/milestones/milestone-kanban-board.tsx` — same pattern (dropdown only). Used in `components/ctms/milestones/milestones-tab.tsx`.
- **Data**: Tasks and study_milestones in Supabase; status updates via `lib/actions/tasks.ts` `updateTask` and `lib/actions/milestones.ts` `updateMilestone`.
- **DnD**: Project already uses **@dnd-kit** in `components/patients/patient-data-table.tsx`; reuse for Kanban (droppable columns + draggable cards).

## Target behavior

- **Boards**: Create, edit (name, description, optional study scope), and delete kanban boards. Boards are company-scoped; optional study filter.
- **Board types**: Task boards (columns = task statuses) and milestone boards (columns = milestone statuses). Default columns per type as today.
- **Drag-and-drop**: Cards (tasks or milestones) draggable; dropping in a column updates status via existing `updateTask` / `updateMilestone`.
- **Navigation**: New “Boards” area: list of boards and board detail view with Kanban UI. Current Kanban views replaced or routed into this system.

## Architecture

- **Boards and lists** are new entities. **Cards** are not a new table: they are tasks or milestones. Each list has a `status`; moving a card to a list updates that item’s status.
- Server actions: boards CRUD + getBoardWithLists; reuse updateTask / updateMilestone for card moves.

## Implementation plan (core)

1. **Database**: New migration for `kanban_boards`, `kanban_lists`, RLS, default list seed on create.
2. **Types & actions**: KanbanBoard, KanbanList; `lib/actions/kanban-boards.ts` (getBoards, getBoardWithLists, createBoard, updateBoard, deleteBoard).
3. **Routes**: `app/protected/boards/page.tsx`, `app/protected/boards/[id]/page.tsx`.
4. **Shared Kanban UI**: New component using @dnd-kit (droppable columns, draggable cards); reuse card UI from existing Kanban components.
5. **Replace current Kanban**: Tasks page and study detail Milestones/Tasks point to boards or embed new Kanban; remove/deprecate standalone TaskKanbanBoard/MilestoneKanbanBoard as primary UX.

---

## Optional enhancements (detailed)

These can be implemented after the core Trello-like flow is in place.

### 1. List management

- **Edit list title**: Allow renaming a column (e.g. “To Do” → “Backlog”). Update `kanban_lists.title` via new action `updateList(boardId, listId, { title })`. RLS already scoped by board.
- **Reorder lists**: Drag columns horizontally to change order. Add `position` (integer) to `kanban_lists` if not already present; new action `reorderLists(boardId, listIds[])` that updates `position` for each list. Use @dnd-kit sortable on the list containers.
- **Add list**: For task boards, adding a list means either (a) mapping to an existing TaskStatus (if you allow duplicate status columns) or (b) extending the TaskStatus enum and DB (larger change). For MVP, “add list” could only allow adding a second column for the same status (e.g. “In Progress (urgent)” and “In Progress (normal)”) — then cards would need a `list_id` to live in a specific column, which diverges from “cards = tasks.” Simpler approach: keep fixed columns per board type; “list management” = edit title + reorder only.
- **Remove list**: Deleting a list could move its cards to another list (e.g. “To Do”) or require the list to be empty. If lists are 1:1 with status, “remove list” might mean hiding that status from the board (soft delete or a `visible` flag) and not deleting the list row so that existing data still has a status.

**Recommendation**: Implement “edit list title” and “reorder lists” first; treat “add/remove list” as a later phase and keep one column per status for the initial enhancement.

### 2. Card reorder within column

- **Behavior**: User can reorder cards inside a single column (e.g. prioritize “To Do” items).
- **Data**: Tasks and study_milestones do not have a `position` or `sort_order` today. Options:
  - **A)** Add `sort_order` (integer) to `tasks` and `study_milestones`, and update it when reordering. Reorder action: `reorderTasksInList(listId, taskIds[])` / `reorderMilestonesInList(listId, milestoneIds[])` that writes `sort_order` and optionally `updated_at`.
  - **B)** Store order in a separate table, e.g. `kanban_card_positions (board_id, list_id, entity_type, entity_id, position)`. Cards without a row default to creation order or alphabetical. This keeps tasks/milestones unchanged but adds another table and sync logic.
- **UI**: Use `@dnd-kit/sortable` for the card list inside each column; same-column drag updates order and calls the reorder action. Cross-column drag still updates status (and optionally clears or sets position in the target list).

**Recommendation**: Option A (add `sort_order` to tasks and study_milestones) keeps a single source of truth; use a nullable integer so existing rows can remain unordered until first reorder.

### 3. Default boards

- **Behavior**: When a user (or company) has no boards, auto-create one or more so “Open Kanban” always has a target.
- **Options**:
  - **Company-level**: On first visit to `/protected/boards`, if no boards exist, create “Task Board” and “Milestone Board” (or a single “Main board” of type task) for the user’s company. Can be done in a loading/effect in the list page or in a middleware/route handler.
  - **Study-level**: When opening a study’s Milestones or Tasks tab, if no board exists for that study, offer “Create board for [Study name]” or auto-create a study-scoped board and redirect to it.
- **Implementation**: Reuse `createBoard` with default name and type; optionally add a `getOrCreateDefaultBoard(companyId, type)` or `getOrCreateStudyBoard(studyId, type)` that returns existing or creates and returns new.

### 4. Board settings and visibility

- **Settings**: Board detail page could have a “Settings” or “Edit board” modal: name, description, study filter (dropdown: All studies / Study X), and maybe “Default board” toggle for the company.
- **Visibility**: If multiple companies or tenants exist, RLS already restricts by company. Optional: “archived” flag on `kanban_boards` so boards can be hidden from the list without losing data; “Archive board” / “Restore” in the UI and filter out archived in `getBoards` unless a “Show archived” is on.

### 5. Keyboard and a11y

- **Keyboard**: @dnd-kit supports keyboard drag; ensure drag handle is focusable and that “Escape” cancels drag. Announcements (live region) for “Picked up card X”, “Moved to column Y” improve screen-reader UX.
- **Focus and drop targets**: After drop, move focus to the dropped card or to the column header. Clearly indicate drop targets (e.g. border or background change on drag over) and allow “Move to [column name]” via keyboard (e.g. arrow keys to cycle columns and Enter to drop).

### 6. Performance and UX polish

- **Optimistic updates**: On drag end, optimistically move the card in local state and revert if `updateTask` / `updateMilestone` fails; show a toast on error.
- **Loading and empty states**: Skeleton or spinner while board/lists/cards load; empty state per column (“No tasks — drag one here or create one”) and for the whole board (“Create a task to get started” with link to task creation if in scope).
- **Bulk actions** (stretch): Select multiple cards (e.g. checkboxes) and “Move to…” or “Change status” to apply one status update to many items; useful for large boards.

---

## Summary table

| Enhancement              | Effort | Depends on        | Notes                                      |
|--------------------------|--------|-------------------|--------------------------------------------|
| Edit list title          | Low    | Core              | Single update action + inline edit UI      |
| Reorder lists            | Low    | Core              | position + reorderLists + sortable columns |
| Add/remove list          | Medium | Core + decisions  | May require list_id on cards or soft delete |
| Card reorder in column   | Medium | Core + sort_order | Add column to tasks/milestones or new table |
| Default boards           | Low    | Core              | getOrCreate in list or study page         |
| Board settings/archive   | Low    | Core              | updateBoard + archived flag, filter in getBoards |
| Keyboard / a11y          | Low–Med| Core Kanban       | dnd-kit + live region + focus management   |
| Optimistic updates       | Low    | Core              | Local state + revert on error             |
| Empty/loading states     | Low    | Core              | UI only                                   |
| Bulk move cards          | Medium | Core              | Multi-select + one status update          |
