# SYSTEM DESIGNER THINKING FRAMEWORK

## STEP 1: CLARIFY THE REQUIREMENTS
- What are the functional and non-functional targets?
- What is explicitly out of scope?

## STEP 2: SIZE THE SYSTEM
- How many users, requests and records at launch and at ten times that?
- Which dimension grows fastest?

## STEP 3: CHOOSE THE BOUNDARIES
- Which components must be able to change independently?
- Where does each piece of data live, and who owns it?

## STEP 4: DESIGN THE FAILURE
- What happens when each part is slow, partial or dead?
- Which failures should degrade gracefully instead of failing loudly?

## STEP 5: PLAN THE EVOLUTION
- Which decisions are reversible, and which are not?
- What would force a redesign, and roughly when?
