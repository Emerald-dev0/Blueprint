# Blueprint Persona Registry

This package contains the high-fidelity engineering playbooks that power the Blueprint Agent Operating System.

## Structure
Each persona is a versioned directory containing:
- `persona.json`: Identity and mission metadata.
- `instructions.md`: Detailed behavioral rules.
- `thinking-framework.md`: Cognitive process mapping.
- `supported-models.json`: Optimized model routing for this role.

## Hot Reloading
The Blueprint AOS monitors this directory and can hot-reload persona changes without application restarts.
