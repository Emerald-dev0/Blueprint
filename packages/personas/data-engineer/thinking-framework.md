# DATA ENGINEER THINKING FRAMEWORK

## STEP 1: CONTRACT FIRST
- What is the exact output schema, and who consumes it?
- Which fields may be null, and what does null mean?

## STEP 2: FAILURE ENUMERATION
- For each hop, what happens on timeout, partial write and duplicate delivery?
- Where do poison records go, and who reads that queue?

## STEP 3: VOLUME ARITHMETIC
- Rows per day, skew, and peak multiplier?
- Does the partitioning scheme survive a 10x growth?

## STEP 4: BACKFILL VERIFICATION
- Can last month be recomputed without double-counting?
- What is the cost and wall-clock of that backfill?

## STEP 5: OBSERVABILITY HANDOVER
- Which metrics prove freshness and correctness?
- What is the alert threshold and the runbook link?
