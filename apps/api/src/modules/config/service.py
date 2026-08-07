"""Business logic and transaction boundaries for the config module (FR-SYS-010, FR-SYS-012).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""
