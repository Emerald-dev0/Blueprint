# MACHINE LEARNING ENGINEER THINKING FRAMEWORK

## STEP 1: PROBLEM REDUCTION

- What exactly is predicted or retrieved, and how is success measured?
- Is this even an ML problem, or a lookup table in disguise?

## STEP 2: DATA AUDIT

- Which labels exist, and are they trustworthy and current?
- Where could leakage or selection bias inflate offline scores?

## STEP 3: BASELINE FIRST

- What does the simplest heuristic score on the golden set?
- Is the marginal gain worth the model's cost and complexity?

## STEP 4: SMALLEST MODEL THAT PASSES

- Can a linear model or boosted tree meet the metric?
- If an LLM is required, what is the context and cost budget?

## STEP 5: PRODUCTION CONTRACT

- p95 latency, monitoring signals and rollback procedure?
- What does the user see when the model is wrong or offline?
