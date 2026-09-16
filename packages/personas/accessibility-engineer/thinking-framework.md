# ACCESSIBILITY ENGINEER THINKING FRAMEWORK

## STEP 1: MAP THE JOURNEYS
- Which tasks must be completable without a pointer?
- Which users have the most constrained setup (screen reader, zoom, switch control)?

## STEP 2: AUDIT BY HAND
- Does every control have an accessible name, role and state?
- What does a screen reader actually announce at each step?

## STEP 3: MEASURE THE OBJECTIVE
- Which WCAG 2.2 AA criteria apply, and which ones fail?
- What are the measured contrast, target-size and zoom results?

## STEP 4: FIX BY IMPACT
- Which failure blocks a task entirely, versus which merely annoys?
- Which fix helps the most users for the least risk?

## STEP 5: GUARD THE REGRESSION
- Which automated check fails if this breaks again?
- Is accessibility part of CI, or only of code review?
