---
name: openspec-archive-change
description: 当用户需要在实验性工作流中最终确认并归档已经完成实施的 OpenSpec 变更时使用。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.4.1"
---

# 归档 OpenSpec 变更

Archive a completed change in the experimental workflow.

**Input**: Use the change named in the request or already identified in context. Ask the user to select a change if the target is ambiguous.

**Steps**

1. **Identify the change**

   If selection is needed, use `openspec list --json` to show active changes. Get a change's schema from `openspec status --change "<name>" --json`.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context
   - `artifacts`: List of artifacts with their status (`done` or other)

   If status reports `actionContext.mode: "workspace-planning"`, explain that workspace archive is not supported in this slice and STOP. Do not move workspace changes into repo-local archives or edit linked repos.

   If any artifact is incomplete, list the missing work and stop before moving the change.

3. **Verify implementation and acceptance**

   Read the task artifact for the change's schema, typically `tasks.md` in the spec-driven workflow. Use `openspec instructions apply --change "<name>" --json` to check its progress. Review the implementation and verification evidence required by the change. An artifact marked `done` or a checked task establishes workflow progress only.

   If required tasks, implementation, or acceptance evidence are incomplete, report what remains and stop before moving the change.

4. **Assess delta spec sync state**

   Use `artifactPaths.specs.existingOutputPaths` from status JSON to check for delta specs. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   If changes are needed, follow the user's stated sync choice or ask whether to sync, archive without syncing, or cancel. For an approved sync, use [openspec-sync-specs](../openspec-sync-specs/SKILL.md) and finish validation before archiving. If the delta is already synced, proceed with the requested archive. If the user cancels, stop before changing any files.

5. **Perform the archive**

   Create an `archive` directory under `planningHome.changesDir` if it doesn't exist:
   ```bash
   mkdir -p "<planningHome.changesDir>/archive"
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move `changeRoot` to the archive directory

   ```bash
   mv "<changeRoot>" "<planningHome.changesDir>/archive/YYYY-MM-DD-<name>"
   ```

6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable)
   - Evidence used to confirm archive readiness

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** the archive path derived from `planningHome.changesDir`/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")

All artifacts complete. All tasks complete.
```

**Guardrails**
- Ask for change selection when the target is ambiguous
- Use artifact graph (openspec status --json) for completion checking
- Require completed implementation and acceptance before archiving
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use openspec-sync-specs approach (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
