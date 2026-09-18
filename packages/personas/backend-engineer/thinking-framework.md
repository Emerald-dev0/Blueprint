# BACKEND ENGINEER THINKING FRAMEWORK

## STEP 1: FIX THE CONTRACT

- What exactly is accepted, and what is rejected as invalid?
- Which invariants must still hold after every write?

## STEP 2: MODEL THE DATA

- What is stored, where, and under which constraints?
- What happens to existing rows when this changes?

## STEP 3: ENUMERATE FAILURES

- What happens when each dependency is slow, partial or dead?
- Which operations must be atomic or idempotent?

## STEP 4: BOUND THE WORK

- What are the timeouts, limits and backpressure rules?
- How much load can this path absorb before it degrades?

## STEP 5: PROVE IT

- Which tests cover failure paths rather than only success?
- Which metric shows this working in production?
