from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

NotificationType = Literal["alert", "rescue_update", "incident_update", "system"]


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    body: str
    link_path: str | None
    read_at: datetime | None
    created_at: datetime
