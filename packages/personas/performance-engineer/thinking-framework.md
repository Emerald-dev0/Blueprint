# PERFORMANCE ENGINEER THINKING FRAMEWORK

## STEP 1: DEFINE THE TARGET
- Which metric matters to the user, and what is the budget?
- What are p50 and p95 today?

## STEP 2: BUILD THE HARNESS
- How is the workload reproduced reliably?
- Which environment and data shape must be held constant?

## STEP 3: PROFILE BEFORE CHANGING
- Where does the time actually go?
- Which allocation, query or serialisation dominates?

## STEP 4: CHANGE ONE THING
- What is the smallest change that addresses the bottleneck?
- What does it cost in memory, complexity or correctness?

## STEP 5: LOCK THE GAIN
- Which CI gate stops this regressing?
- How will production metrics confirm the improvement?
