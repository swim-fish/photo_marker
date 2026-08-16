<!--
Sync Impact Report
- Version change: unratified template -> 1.0.0
- Modified principles:
  - Placeholder principles -> I. Code Quality and Scope Discipline
  - Placeholder principles -> II. Test-Driven Development and Regression Protection
  - Placeholder principles -> III. Verification and Definition of Done
  - Placeholder principles -> IV. User Experience Consistency
  - Placeholder principles -> V. Architecture Decisions and Documentation
  - Placeholder principles -> VI. Measurable Performance, Reliability, and Compatibility
  - Placeholder principles -> VII. Deliberate Delegation and Independent Review
  - Placeholder principles -> VIII. Governance and Exceptions
- Added sections:
  - Normative Interpretation and Proportionality
  - Development Workflow and Compliance
- Removed sections: none; placeholder-only sections were resolved
- Follow-up TODOs: none
-->
# Photo Marker Constitution

## Core Principles

### I. Code Quality and Scope Discipline

Changes MUST be the smallest coherent solution that satisfies the approved specification. Existing
public contracts, observable behavior, and project conventions MUST be preserved unless the change
is intentional and its migration path is documented. Unrelated refactoring, unnecessary dependency
additions, and speculative abstractions MUST NOT be included. Every changed source file MUST be
formatted with the project formatter, and all relevant lint and static-analysis checks MUST pass.

When more than one compliant design exists, the implementation SHOULD prefer the design with fewer
new concepts, dependencies, and altered files. A broader change MAY be made only when the approved
specification requires it or when a documented blocker makes the smaller solution infeasible.

Rationale: a narrow, conventional change is easier to review, verify, maintain, and revert.

### II. Test-Driven Development and Regression Protection

Every behavior change and bug fix MUST follow Red-Green-Refactor: first write or update a test,
observe it fail for the expected reason, implement the smallest solution that makes it pass, and
refactor only while the relevant tests remain green. Before a structural refactor begins, existing
behavior MUST have adequate characterization coverage for the paths being changed.

Tests MUST NOT be deleted, weakened, skipped, or rewritten merely to make a change pass. If an
automated failing test is not technically meaningful or practical, the implementation record MUST
state why and identify an explicit alternative verification method. Additional tests SHOULD target
the highest-risk observable behavior rather than duplicate coverage. A non-automated check MAY
substitute only when automation cannot meaningfully validate the behavior and the substitution is
documented.

Rationale: test-first evidence distinguishes intended behavior changes from regressions and keeps
refactoring safe.

### III. Verification and Definition of Done

Verification MUST be proportional to the change's identified risk. Focused tests MUST be run during
development; before handoff, the relevant broader tests, build, lint, static-analysis, and format
checks MUST be run when they apply. UI changes MUST receive behavior validation and visual
inspection. Performance-sensitive changes MUST receive focused, representative measurements against
an applicable budget or baseline.

The least expensive set of checks that adequately covers the identified risks SHOULD be selected.
Long-running, exhaustive, or broad performance suites MUST NOT be run unless an approved
specification, release gate, material performance risk, or inadequate focused baseline requires
them. A completion report MUST list each check performed and its outcome, each skipped or
inapplicable check with a reason, and all remaining risks. Work MUST NOT be declared complete while
a required check is failing or unperformed unless an explicit blocker is reported.

Rationale: completion is based on relevant evidence, without imposing costly checks that do not
improve confidence for the change at hand.

### IV. User Experience Consistency

Every user-facing change MUST follow the existing design system, interaction conventions,
accessibility requirements, responsive behavior, localization model, and defined loading, empty,
error, disabled, and success states. Material changes to layouts, navigation, interactions, design
tokens, component behavior, or accessibility MUST update the relevant English documentation under
`docs/ui` in the same change.

Pure internal refactors with no user-visible effect MUST NOT create UI documentation churn, and the
completion report MUST state that assessment. Reuse of an existing documented interaction pattern
SHOULD be preferred. A new pattern MAY be introduced only when the approved specification requires
it and the corresponding `docs/ui` documentation is updated.

Rationale: consistent, accessible behavior reduces user surprise and prevents implementation and
documentation from diverging.

### V. Architecture Decisions and Documentation

Technical documentation, ADRs, and `docs/ui` content MUST be written in English. Every
`speckit.plan`, `speckit.analyze`, `speckit.implement`, and `speckit.converge` run MUST assess both
ADR impact and UI-documentation impact. `speckit.analyze` MUST remain read-only and MUST report
missing, stale, or conflicting ADRs instead of editing them.

An ADR MUST be created or amended when a material architecture decision, dependency strategy,
public contract, data model, migration, security boundary, or performance tradeoff changes. ADRs
MUST NOT be used as execution logs. When no ADR change is required, the report MUST include
`ADR impact: none` followed by a concise reason. Existing ADRs SHOULD be amended when the decision
is evolving; a new ADR MAY be created when the decision is independently reviewable or supersedes
an earlier decision.

Rationale: durable documentation records consequential decisions while avoiding low-value
documentation churn.

### VI. Measurable Performance, Reliability, and Compatibility

Performance-sensitive specifications and plans MUST define measurable budgets or baselines for the
affected user flows or system paths. Implementations MUST compare focused, relevant measurements
before and after the change and MUST NOT introduce an unexplained regression. The measurement scope
and duration SHOULD be no larger than necessary to detect the identified risk; prolonged testing
MAY be used when short representative measurements cannot establish confidence.

Public APIs, persisted data, and supported user workflows MUST remain compatible unless an approved
migration and rollback strategy exists. Failures MUST be diagnosable through actionable error
reporting or observability without exposing secrets or sensitive user data.

Rationale: explicit evidence makes performance and reliability claims reviewable while compatibility
rules protect users and stored data.

### VII. Deliberate Delegation and Independent Review

The primary agent MUST own requirements, ambiguity resolution, architecture, integration, and final
judgment. Subagents MUST be exceptional rather than the default and MUST NOT be spawned merely for
context management or routine work. Delegation MUST be limited to clear, bounded, independent work
with explicit ownership, acceptance criteria, and expected output, or to a distinct read-only role
whose independent judgment materially improves a high-risk decision.

Parallel write tasks MUST have disjoint file ownership. Routine, low-risk changes require only
primary-agent review. High-risk or cross-cutting changes MUST receive independent, role-specific
review with non-overlapping review scopes. Delegation MAY be omitted whenever the primary agent can
perform and verify the work directly without compromising an applicable review requirement.

Rationale: deliberate delegation prevents coordination overhead and conflicting edits while
preserving independent scrutiny where it materially reduces risk.

### VIII. Governance and Exceptions

Any deviation from this constitution MUST document its rationale, affected principles, risks,
compensating validation, and follow-up action before completion. Unresolved material findings from
specification analysis, tests, security review, accessibility review, or performance validation MUST
block completion. Constitution amendments MUST preserve version history and explain their impact on
existing specifications and plans.

Exceptions SHOULD be narrow, time-bounded when practical, and assigned to a named follow-up owner or
tracking artifact. A temporary exception MAY be approved only when its documented compensating
controls reduce the remaining risk to an acceptable level.

Rationale: explicit exceptions keep urgent decisions auditable without silently weakening project
standards.

## Normative Interpretation and Proportionality

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative. MUST and MUST NOT define
non-negotiable requirements. SHOULD and SHOULD NOT define the expected default; any departure MUST
be justified in the relevant specification, plan, review, or completion report. MAY grants
permission and does not create a requirement.

"Relevant" and "risk-proportional" MUST be determined from the changed behavior, affected users,
public contracts, data durability, security and privacy boundaries, accessibility, performance
budgets, and rollback cost. Verification MUST focus on those identified risks. Documentation-only
changes MAY use structural and content validation without running application test suites when no
executable behavior can be affected; the skipped suites and reason MUST still be reported.

## Development Workflow and Compliance

1. Before implementation, the approved specification and affected contracts MUST be identified.
   Ambiguities that could materially change scope or behavior MUST be resolved or explicitly
   recorded as blockers.
2. Behavior changes, bug fixes, and refactors MUST apply the test discipline in Principle II.
3. Implementation MUST remain within approved scope. Any newly discovered cross-cutting need MUST
   be returned to specification or plan review before expanding the change.
4. Before handoff, the applicable checks from Principle III MUST be completed. ADR and
   UI-documentation impact MUST be assessed whenever required by Principles IV and V.
5. Review MUST verify constitutional compliance, unresolved findings, scope, and evidence. A
   completion statement MUST include verification outcomes, skipped checks, remaining risks,
   `ADR impact: none` with a reason when applicable, and the UI-documentation impact assessment.

## Governance

This constitution supersedes conflicting project practices and workflow guidance. Amendments MUST
be proposed as an explicit constitution change, include a Sync Impact Report, state the reason for
the change, assess effects on existing specifications and plans, and receive project-owner approval
before they govern new work. A migration or follow-up plan MUST accompany any amendment that makes
existing approved work non-compliant.

Constitution versions MUST follow semantic versioning: MAJOR for backward-incompatible governance
changes or removed/redefined principles, MINOR for new principles or materially expanded guidance,
and PATCH for non-semantic clarifications. The original ratification date MUST remain unchanged;
the last-amended date MUST reflect the amendment date.

Every specification, plan, implementation, analysis, convergence pass, and review MUST check the
applicable constitutional gates. Material non-compliance MUST block approval or completion unless
the exception process in Principle VIII is satisfied. Compliance reviews SHOULD cite concrete
artifacts such as tests, measurements, ADRs, UI documentation, or completion reports. Project owners
MAY require stricter checks for a release or high-risk change when the additional scope and reason
are documented.

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
