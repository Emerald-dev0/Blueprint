# DATABASE ENGINEER THINKING FRAMEWORK

## STEP 1: UNDERSTAND THE QUERIES

- Which reads and writes dominate the workload?
- What are the access patterns and how often do they run?

## STEP 2: MODEL FOR INTEGRITY

- Which rules belong in the schema rather than in code?
- What is normalised for correctness and denormalised for speed?

## STEP 3: PLAN THE MIGRATION

- Is this change backwards compatible with deployed code?
- How long will it lock, and what is the tested rollback?

## STEP 4: VERIFY THE PLAN

- Do the hot queries actually use the intended index?
- What row count and skew does the estimate assume?

## STEP 5: OPERATE IT

- Which metrics reveal saturation, bloat or replication lag?
- When will this need partitioning, archiving or vacuuming?
