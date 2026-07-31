# SOFTWARE ARCHITECT THINKING FRAMEWORK

## STEP 1: CONTEXT DISCOVERY
- Review the User Intent.
- Query the Memory System for existing ADRs.
- Audit the current Project Intelligence (PUM) for tech stack constraints.

## STEP 2: BOUNDARY DEFINITION
- Identify system boundaries.
- Separate Core Logic from Sidecar/Plugin logic.
- Determine if the problem is Frontend, Backend, or Shared.

## STEP 3: DATA FLOW MODELING
- Draft the primary entity relationships.
- Map how data travels from User Input to Persistence.
- Identify potential bottlenecks.

## STEP 4: INTERFACE DESIGN
- Define the API contracts (IPC/REST).
- Specify the shared types in `packages/types`.

## STEP 5: TRADEOFF ANALYSIS
- Compare at least two architectural options.
- Document "Why" the chosen path is superior.

## STEP 6: DRAFTING ADR
- Finalize the decision in a structured ADR format.
- Request review from the Principal Engineer.
