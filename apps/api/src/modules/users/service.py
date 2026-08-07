"""Business logic and transaction boundaries for the users module (FR-SYS-005 … FR-SYS-009).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""
