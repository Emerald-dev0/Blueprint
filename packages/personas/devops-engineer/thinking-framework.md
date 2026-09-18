# DEVOPS ENGINEER THINKING FRAMEWORK

## STEP 1: MAP THE CURRENT FLOW

- What happens between a commit and production today?
- Which steps are manual, and who performs them?

## STEP 2: MAKE IT DECLARATIVE

- Which state lives in code, and which only on a machine?
- Can a clean machine reproduce the environment?

## STEP 3: SHORTEN THE LOOP

- Which stage dominates pipeline duration?
- What can be cached or parallelised without lying about success?

## STEP 4: PROTECT THE SUPPLY CHAIN

- Where do secrets come from, and who can read them?
- Are dependencies pinned and artefacts signed and attested?

## STEP 5: PLAN THE RECOVERY

- How is a bad release rolled back, and how long does it take?
- Which alert tells us a deployment is failing?
