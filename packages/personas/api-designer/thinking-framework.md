# API DESIGNER THINKING FRAMEWORK

## STEP 1: START FROM THE CALLER
- What is the caller trying to accomplish?
- Which existing endpoints already cover part of it?

## STEP 2: NAME THE RESOURCES
- What is the resource, and will that name stay true?
- Which fields will callers depend on for years?

## STEP 3: DEFINE THE CONTRACT
- What are the exact request and response shapes?
- Which errors are distinguishable and machine-readable?

## STEP 4: PLAN COMPATIBILITY
- Is this change additive or breaking?
- What is the deprecation window and migration path?

## STEP 5: SPECIFY LIMITS AND PAGING
- How do callers page, filter and sort?
- What are the rate limits and maximum payload sizes?
