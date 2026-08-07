"""Single import point for every ORM model.

Alembic's autogenerate compares `Base.metadata` against the live database. A model
that nothing imports is absent from that metadata, and autogenerate will happily
emit a migration that **drops its table**. Import every new models module here the
moment you create it.
"""

from __future__ import annotations

from src.db.base import Base
from src.modules.auth import models as auth_models
from src.modules.config import models as config_models
from src.modules.geo import models as geo_models
from src.modules.users import models as users_models

__all__ = [
    "Base",
    "auth_models",
    "config_models",
    "geo_models",
    "users_models",
]
