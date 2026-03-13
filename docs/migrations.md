# Migration workflow

Onaply is still early, but schema changes should stop being ad hoc.

## Current rule
- Treat `prisma/schema.prisma` as the source of truth.
- For every intentional schema change, create a named Prisma migration.
- Keep migrations small and domain-scoped.
- Run `npm run test` after schema changes.

## Local workflow
```bash
npm run db:generate
npm run db:migrate -- --name describe_change
npm run db:seed
npm run test
```

## Naming convention
Use: `domain_change_purpose`

Examples:
- `supplier_foundation`
- `receiving_hold_reasons`
- `item_reorder_defaults`

## While still iterating fast
If you use `db push` for a throwaway local reset, follow it by either:
1. creating the real migration before merge, or
2. reverting the schema experiment.

Do not merge durable schema changes without a migration folder.
