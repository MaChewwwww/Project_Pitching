"""Business logic and transaction boundaries for the geo module (FR-SYS-013, FR-SYS-015, FR-MAP-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""
