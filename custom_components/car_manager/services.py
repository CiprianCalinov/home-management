"""Services for Car Manager.

Exposed so the user can wire automations: log fuel/cost from anywhere, force a
recompute, or push expiry alerts to a notify service / persistent notification.
"""

from __future__ import annotations

import logging

import voluptuous as vol
import homeassistant.util.dt as dt_util
from homeassistant.core import HomeAssistant, ServiceCall, callback
import homeassistant.helpers.config_validation as cv

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

SERVICE_ADD_FUEL = "add_fuel"
SERVICE_ADD_COST = "add_cost"
SERVICE_REFRESH = "refresh"
SERVICE_NOTIFY_DUE = "notify_due"

ADD_FUEL_SCHEMA = vol.Schema(
    {
        vol.Required("car_id"): cv.string,
        vol.Optional("date"): cv.string,
        vol.Required("liters"): vol.Coerce(float),
        vol.Required("price_total"): vol.Coerce(float),
        vol.Optional("odometer"): vol.Coerce(int),
        vol.Optional("full", default=True): cv.boolean,
        vol.Optional("note", default=""): cv.string,
    }
)

ADD_COST_SCHEMA = vol.Schema(
    {
        vol.Required("car_id"): cv.string,
        vol.Optional("date"): cv.string,
        vol.Required("category"): cv.string,
        vol.Required("amount"): vol.Coerce(float),
        vol.Optional("note", default=""): cv.string,
    }
)

NOTIFY_DUE_SCHEMA = vol.Schema(
    {
        vol.Optional("days"): vol.Coerce(int),
        vol.Optional("notify_service"): cv.string,
    }
)


@callback
def async_register_services(hass: HomeAssistant, coordinator) -> None:
    """Register integration services once."""
    if hass.data[DOMAIN].get("services_registered"):
        return

    def _today() -> str:
        return dt_util.now().date().isoformat()

    async def handle_add_fuel(call: ServiceCall) -> None:
        data = dict(call.data)
        data.setdefault("date", _today())
        await coordinator.store.async_add_fuel(data)
        await coordinator.async_notify_changed()

    async def handle_add_cost(call: ServiceCall) -> None:
        data = dict(call.data)
        data.setdefault("date", _today())
        await coordinator.store.async_add_cost(data)
        await coordinator.async_notify_changed()

    async def handle_refresh(call: ServiceCall) -> None:
        await coordinator.async_notify_changed(cars_changed=True)

    async def handle_notify_due(call: ServiceCall) -> None:
        settings = coordinator.store.settings
        threshold = call.data.get("days") or max(settings.get("notify_days") or [30])
        notify_service = call.data.get("notify_service") or settings.get("notify_service")

        view = coordinator.data or {}
        lines: list[str] = []
        for car in view.get("cars", []):
            for alert in car.get("attention", []):
                days = alert.get("days")
                if days is None or days <= threshold:
                    when = f"{days} zile" if days is not None else "verifică"
                    lines.append(f"{car['name']}: {alert['label']} — {when}")

        if not lines:
            return

        message = "\n".join(lines)
        title = "Car Manager — atenționări"
        if notify_service and "." in notify_service:
            domain, service = notify_service.split(".", 1)
            await hass.services.async_call(
                domain, service, {"title": title, "message": message}, blocking=False
            )
        else:
            await hass.services.async_call(
                "persistent_notification",
                "create",
                {"title": title, "message": message, "notification_id": "car_manager_due"},
                blocking=False,
            )

    hass.services.async_register(DOMAIN, SERVICE_ADD_FUEL, handle_add_fuel, schema=ADD_FUEL_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_ADD_COST, handle_add_cost, schema=ADD_COST_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_REFRESH, handle_refresh)
    hass.services.async_register(
        DOMAIN, SERVICE_NOTIFY_DUE, handle_notify_due, schema=NOTIFY_DUE_SCHEMA
    )
    hass.data[DOMAIN]["services_registered"] = True


@callback
def async_unregister_services(hass: HomeAssistant) -> None:
    for service in (SERVICE_ADD_FUEL, SERVICE_ADD_COST, SERVICE_REFRESH, SERVICE_NOTIFY_DUE):
        hass.services.async_remove(DOMAIN, service)
    hass.data.get(DOMAIN, {}).pop("services_registered", None)
