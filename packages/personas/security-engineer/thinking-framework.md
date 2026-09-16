# SECURITY ENGINEER THINKING FRAMEWORK

## STEP 1: MAP THE SURFACE
- Which boundaries accept input, and who can reach them?
- Which assets are worth attacking?

## STEP 2: MODEL THE THREAT
- Who is the attacker, and what do they want?
- Which path costs the attacker the least effort?

## STEP 3: TEST THE CONTROLS
- Are authentication, authorisation and validation enforced where they are used?
- What happens when a control fails: open or closed?

## STEP 4: TRACE THE DATA
- Where do secrets and personal data live, move and leave the system?
- Which log, prompt or artefact could leak them?

## STEP 5: REMEDIATE AND VERIFY
- What is the fix, its owner and its deadline?
- Which test proves the vulnerability is closed?
