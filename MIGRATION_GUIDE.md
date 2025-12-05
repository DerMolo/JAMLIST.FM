# Migration Guide - Granular Approval System

## Database Migration Required

The new granular approval system requires database schema changes. Follow these steps to apply the migration.

---

## Step 1: Generate Migration

Run the following command to generate the migration file:

```bash
npx prisma migrate dev --name add_granular_approvals
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Update the database schema
3. Regenerate the Prisma client

---

## Step 2: Verify Migration

The migration should add the following fields to the `PRDiff` table:

```sql
ALTER TABLE "PRDiff" ADD COLUMN "trackAdditionApprovals" JSONB;
ALTER TABLE "PRDiff" ADD COLUMN "trackRemovalApprovals" JSONB;
ALTER TABLE "PRDiff" ADD COLUMN "trackReorderApprovals" JSONB;
ALTER TABLE "PRDiff" ADD COLUMN "metadataApprovals" JSONB;
```

---

## Step 3: Apply Migration to Production

When deploying to production, run:

```bash
npx prisma migrate deploy
```

This applies pending migrations without prompting for confirmation.

---

## Step 4: Verify Prisma Client

Ensure the Prisma client is regenerated with the new schema:

```bash
npx prisma generate
```

---

## Step 5: Test the Changes

### Backend Testing:

1. **Test PR Creation with Branch:**
```bash
curl -X POST http://127.0.0.1:3000/api/pull-requests \
  -H "Content-Type: application/json" \
  -d '{
    "playlistId": "your-playlist-id",
    "branchId": "your-branch-id",
    "title": "Test PR with auto-calculated diff",
    "description": "Testing branch change tracking"
  }'
```

2. **Test Granular Approval:**
```bash
curl -X POST http://127.0.0.1:3000/api/pull-requests/{prId}/approve-change \
  -H "Content-Type: application/json" \
  -d '{
    "changeType": "track_addition",
    "changeId": "track-spotify-id",
    "approval": "approved"
  }'
```

3. **Test Track Reordering:**
```bash
# Playlist reorder
curl -X POST http://127.0.0.1:3000/api/playlists/{playlistId}/tracks/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "internal-track-id",
    "newPosition": 3
  }'

# Branch reorder
curl -X POST http://127.0.0.1:3000/api/playlists/{playlistId}/branches/{branchId}/tracks/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "internal-track-id",
    "newPosition": 2
  }'
```

### UI Testing:

1. Navigate to a PR detail page
2. Verify branch tracks are displayed (if PR is from a branch)
3. Check notifications appear for:
   - New likes
   - New branches
   - PR events

---

## Rollback Instructions

If you need to rollback the migration:

### Option 1: Rollback Last Migration
```bash
npx prisma migrate resolve --rolled-back add_granular_approvals
```

### Option 2: Manual Rollback
Run this SQL in your database:

```sql
ALTER TABLE "PRDiff" DROP COLUMN IF EXISTS "trackAdditionApprovals";
ALTER TABLE "PRDiff" DROP COLUMN IF EXISTS "trackRemovalApprovals";
ALTER TABLE "PRDiff" DROP COLUMN IF EXISTS "trackReorderApprovals";
ALTER TABLE "PRDiff" DROP COLUMN IF EXISTS "metadataApprovals";
```

Then regenerate the Prisma client:
```bash
npx prisma generate
```

---

## Backward Compatibility

The system is designed to be backward compatible:

1. **Old PRs without granular approvals:** Will continue to work normally. When merged, all changes are applied.

2. **New PRs with granular approvals:** If no approvals are set, all changes are applied (same as before).

3. **Mixed PRs:** PRs can have granular approvals for some changes but not others.

---

## Data Migration (Optional)

If you have existing PRs and want to initialize approval states:

```typescript
// Optional script to initialize approval states for existing PRs
// Run this if you want all existing changes to be "pending"

import { prisma } from './lib/prisma'

async function initializeApprovals() {
  const prs = await prisma.pullRequest.findMany({
    include: { diff: true },
    where: { status: 'PENDING' }
  })

  for (const pr of prs) {
    if (!pr.diff) continue

    const trackChanges = pr.diff.trackChanges as any
    if (!trackChanges) continue

    const trackAdditionApprovals: any = {}
    const trackRemovalApprovals: any = {}

    // Initialize all additions as pending
    if (trackChanges.additions) {
      for (const track of trackChanges.additions) {
        trackAdditionApprovals[track.spotifyId] = 'pending'
      }
    }

    // Initialize all removals as pending
    if (trackChanges.removals) {
      for (const trackId of trackChanges.removals) {
        trackRemovalApprovals[trackId] = 'pending'
      }
    }

    await prisma.pRDiff.update({
      where: { id: pr.diff.id },
      data: {
        trackAdditionApprovals,
        trackRemovalApprovals,
      }
    })
  }

  console.log(`Initialized approvals for ${prs.length} PRs`)
}

// Run: ts-node scripts/init-approvals.ts
initializeApprovals()
```

---

## Environment Variables

No new environment variables are required for these changes.

---

## Dependencies

All new features use existing dependencies. No new packages need to be installed.

---

## Performance Considerations

1. **Granular Approvals:** Stored as JSON, indexed on pullRequestId
2. **Track Reordering:** Updates multiple rows, wrapped in transaction implicitly
3. **Notifications:** Async operation, does not block main request

---

## Monitoring

After deployment, monitor:

1. **PR Merge Times:** Should not increase significantly
2. **Notification Delivery:** Check that notifications are being created
3. **Track Reordering:** Verify no position conflicts occur
4. **Branch Diff Calculation:** Check that all diffs are accurate

---

## Support

If you encounter any issues:

1. Check Prisma logs: `npx prisma studio`
2. Review application logs for errors
3. Verify database connection
4. Ensure Prisma client is up-to-date: `npx prisma generate`

---

**Migration Complexity:** Low  
**Estimated Downtime:** Less than 1 minute  
**Backward Compatible:** Yes  
**Rollback Available:** Yes
