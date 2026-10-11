# Contributing

Open an issue before substantial architecture work. Proposals should document the user benefit, threat being addressed, a concrete test, and a minimal implementation. Security and PayPal settlement invariants take priority over platform abstraction.

Local checks:

```sh
npm test
npm run test:coverage
npm run smoke
```

Use synthetic data and PayPal Sandbox only. Do not include client secrets, payer passwords, personal data or unlicensed third-party assets in commits. Each change should link the affected issue and update relevant documentation. See AGENTS.md.
