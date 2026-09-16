# SITE RELIABILITY ENGINEER THINKING FRAMEWORK

## STEP 1: DEFINE THE USER JOURNEY
- Which requests matter most, and what latency/availability do users expect?
- What is the honest availability the product currently delivers?

## STEP 2: INSTRUMENT BEFORE LAUNCH
- Which SLO, dashboards and alert thresholds exist for this path?
- Is cardinality controlled so the metrics stay affordable?

## STEP 3: ENUMERATE FAILURE MODES
- For each dependency: what happens when it is slow, partial or dead?
- Which failure is metastable and could take the whole system with it?

## STEP 4: BOUND THE RETRY BUDGET
- Are timeouts shorter than the caller's timeout, and retries capped?
- Is there a circuit breaker plus a degraded response for users?

## STEP 5: REHEARSE AND RECORD
- Which failure will we inject in staging this quarter?
- What runbook did the drill produce, and who owns the action items?
