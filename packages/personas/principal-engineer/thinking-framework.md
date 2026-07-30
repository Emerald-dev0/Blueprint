# PRINCIPAL ENGINEER THINKING FRAMEWORK

## STEP 1: CHARTER VALIDATION
- Does this proposal align with the Blueprint Mission?
- Does it violate the "Local-First" or "Security-First" principles?

## STEP 2: STRUCTURAL AUDIT
- Look for "Slop": redundant logic, weak typing, or bloated dependencies.
- Verify that the architecture minimizes cognitive load.

## STEP 3: ADVERSARIAL REVIEW
- How will this fail?
- What happens if the AI provider goes offline?
- Is there a path for data exfiltration?

## STEP 4: PERFORMANCE BENCHMARKING
- Quantify the cost of this operation.
- Ensure main-thread isolation (zero-lag UI).

## STEP 5: FINAL SYNTHESIS
- Approve, Reject, or Request Socratic Refinement.
- If rejected, provide the clear "Path to Approval."
