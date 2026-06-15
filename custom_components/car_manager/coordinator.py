"""Coordinator that recomputes the Car Manager snapshot.

Holds the store, rebuilds the derived view (days remaining etc.) on a daily
cadence and whenever the data changes, and notifies sensors + the frontend.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import homeassistant.util.dt as dt_util
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .compute import build_full_view
from .const import DOMAIN, SIGNAL_CARS_CHANGED, SIGNAL_DATA_UPDATED
from .store import CarManagerStore

_LOGGER = logging.getLogger(__name__)


class CarManagerCoordinator(DataUpdateCoordinator):
    """Owns the store and the computed snapshot exposed to the rest of HA."""

    def __init__(self, hass: HomeAssistant, store: CarManagerStore) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            # recompute "days remaining" roughly once an hour; cheap, no I/O
            update_interval=timedelta(hours=1),
        )
        self.store = store

    async def _async_update_data(self) -> dict[str, Any]:
        today = dt_util.now().date()
        return build_full_view(self.store.data, today)

    async def async_notify_changed(self, *, cars_changed: bool = False) -> None:
        """Call after any write so sensors/panel see fresh numbers."""
        await self.async_refresh()
        if cars_changed:
            async_dispatcher_send(self.hass, SIGNAL_CARS_CHANGED)
        async_dispatcher_send(self.hass, SIGNAL_DATA_UPDATED)
