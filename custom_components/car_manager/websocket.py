"""WebSocket API for the Car Manager frontend panel.

The panel never touches storage directly; it sends these commands and gets
back the freshly computed snapshot. Every write goes through the coordinator
so sensors and other panel clients update immediately.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
import homeassistant.util.dt as dt_util
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .compute import build_full_view
from .const import DOMAIN


def _coordinator(hass: HomeAssistant):
    return hass.data[DOMAIN]["coordinator"]


def _snapshot(hass: HomeAssistant) -> dict[str, Any]:
    """The full payload the panel renders from: raw data + computed view."""
    coordinator = _coordinator(hass)
    store = coordinator.store
    today = dt_util.now().date()
    return {
        "raw": {
            "cars": store.cars,
            "fuel": store.data.get("fuel", []),
            "costs": store.data.get("costs", []),
            "settings": store.settings,
        },
        "view": build_full_view(store.data, today),
    }


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/get_data"})
@websocket_api.async_response
async def ws_get_data(hass, connection, msg):
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/add_car", vol.Required("car"): dict}
)
@websocket_api.async_response
async def ws_add_car(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_add_car(msg["car"])
    await coordinator.async_notify_changed(cars_changed=True)
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_car",
        vol.Required("car_id"): str,
        vol.Required("car"): dict,
    }
)
@websocket_api.async_response
async def ws_update_car(hass, connection, msg):
    coordinator = _coordinator(hass)
    result = await coordinator.store.async_update_car(msg["car_id"], msg["car"])
    if result is None:
        connection.send_error(msg["id"], "not_found", "Car not found")
        return
    await coordinator.async_notify_changed(cars_changed=True)
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/delete_car", vol.Required("car_id"): str}
)
@websocket_api.async_response
async def ws_delete_car(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_delete_car(msg["car_id"])
    await coordinator.async_notify_changed(cars_changed=True)
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/add_fuel", vol.Required("entry"): dict}
)
@websocket_api.async_response
async def ws_add_fuel(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_add_fuel(msg["entry"])
    await coordinator.async_notify_changed()
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/delete_fuel", vol.Required("entry_id"): str}
)
@websocket_api.async_response
async def ws_delete_fuel(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_delete_fuel(msg["entry_id"])
    await coordinator.async_notify_changed()
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/add_cost", vol.Required("entry"): dict}
)
@websocket_api.async_response
async def ws_add_cost(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_add_cost(msg["entry"])
    await coordinator.async_notify_changed()
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/delete_cost", vol.Required("entry_id"): str}
)
@websocket_api.async_response
async def ws_delete_cost(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_delete_cost(msg["entry_id"])
    await coordinator.async_notify_changed()
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/update_settings", vol.Required("settings"): dict}
)
@websocket_api.async_response
async def ws_update_settings(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_update_settings(msg["settings"])
    await coordinator.async_notify_changed()
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/import_merge", vol.Required("data"): dict}
)
@websocket_api.async_response
async def ws_import_merge(hass, connection, msg):
    coordinator = _coordinator(hass)
    await coordinator.store.async_import_merge(msg["data"])
    await coordinator.async_notify_changed(cars_changed=True)
    connection.send_result(msg["id"], _snapshot(hass))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/scan",
        vol.Required("kind"): str,
        vol.Required("image"): str,
        vol.Optional("model"): str,
    }
)
@websocket_api.async_response
async def ws_scan(hass, connection, msg):
    from .vision import async_scan

    result = await async_scan(hass, msg["kind"], msg["image"], msg.get("model", ""))
    connection.send_result(msg["id"], result)


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    """Register all panel websocket commands once."""
    if hass.data[DOMAIN].get("ws_registered"):
        return
    for handler in (
        ws_get_data,
        ws_add_car,
        ws_update_car,
        ws_delete_car,
        ws_add_fuel,
        ws_delete_fuel,
        ws_add_cost,
        ws_delete_cost,
        ws_update_settings,
        ws_import_merge,
        ws_scan,
    ):
        websocket_api.async_register_command(hass, handler)
    hass.data[DOMAIN]["ws_registered"] = True
