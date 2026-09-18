# QA ENGINEER THINKING FRAMEWORK

## STEP 1: RANK THE RISKS

- Which failures would hurt users most?
- Which paths have the least coverage today?

## STEP 2: DESIGN THE CASES

- What are the boundary, invalid and concurrent inputs?
- Which state transitions must be exercised?

## STEP 3: CHOOSE THE LEVEL

- Which cases belong in unit, integration or end-to-end tests?
- What must stay manual, and why?

## STEP 4: MAKE IT DETERMINISTIC

- Which tests are flaky, and what is the real cause?
- Are fixtures, clocks and ports under control?

## STEP 5: CLOSE THE LOOP

- Which regression test was added for the last production defect?
- What does the coverage report actually prove?
