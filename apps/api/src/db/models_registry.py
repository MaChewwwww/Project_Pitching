"""Single import point for every ORM model.

Alembic's autogenerate compares `Base.metadata` against the live database. A model
that nothing imports is absent from that metadata, and autogenerate will happily
emit a migration that **drops its table**. Import every new models module here the
moment you create it.
"""

from __future__ import annotations

from src.db.base import Base
from src.modules.activities import models as activities_models
from src.modules.alerts import models as alerts_models
from src.modules.auth import models as auth_models
from src.modules.config import models as config_models
from src.modules.donations import models as donations_models
from src.modules.evacuation import models as evacuation_models
from src.modules.geo import models as geo_models
from src.modules.preparedness import models as preparedness_models
from src.modules.registry import models as registry_models
from src.modules.users import models as users_models
from src.modules.weather import models as weather_models

__all__ = [
    "Base",
    "activities_models",
    "alerts_models",
    "auth_models",
    "config_models",
    "donations_models",
    "evacuation_models",
    "geo_models",
    "preparedness_models",
    "registry_models",
    "users_models",
    "weather_models",
]
