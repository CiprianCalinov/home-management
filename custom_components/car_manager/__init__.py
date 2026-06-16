"""The Car Manager integration."""

from __future__ import annotations

import logging
import os

from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import (
    DOMAIN,
    PANEL_FILES_URL,
    PANEL_ICON,
    PANEL_JS_FILE,
    PANEL_TITLE,
    PANEL_URL_PATH,
    PLATFORMS,
)
from .coordinator import CarManagerCoordinator
from .services import async_register_services, async_unregister_services
from .store import CarManagerStore
from .websocket import async_register_websocket

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Car Manager from a config entry."""
    domain_data = hass.data.setdefault(DOMAIN, {})

    store = CarManagerStore(hass)
    await store.async_load()

    coordinator = CarManagerCoordinator(hass, store)
    await coordinator.async_config_entry_first_refresh()

    domain_data["store"] = store
    domain_data["coordinator"] = coordinator
    domain_data["entry_id"] = entry.entry_id

    await _async_register_frontend(hass, domain_data)
    async_register_websocket(hass)
    async_register_services(hass, coordinator)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def _async_register_frontend(hass: HomeAssistant, domain_data: dict) -> None:
    """Serve the panel JS and register the sidebar panel (once)."""
    if domain_data.get("frontend_registered"):
        return

    panel_dir = os.path.join(os.path.dirname(__file__), "frontend")

    # Serve the static JS bundle. async_register_static_paths is the modern API
    # (HA 2024.7+); fall back to the legacy call on older cores. Registering the
    # same path twice (e.g. after a reload) raises — that's fine, ignore it.
    if not hass.data.get("_car_manager_static_done"):
        try:
            from homeassistant.components.http import StaticPathConfig

            await hass.http.async_register_static_paths(
                [StaticPathConfig(PANEL_FILES_URL, panel_dir, False)]
            )
        except ImportError:  # pragma: no cover - legacy cores
            hass.http.register_static_path(PANEL_FILES_URL, panel_dir, False)
        except (RuntimeError, ValueError) as err:  # already registered
            _LOGGER.debug("Static path already registered: %s", err)
        hass.data["_car_manager_static_done"] = True

    # Cache-bust the panel module by version so browsers fetch the new file
    # after every update instead of serving a stale cached copy.
    integration = await async_get_integration(hass, DOMAIN)
    version = str(integration.version or "0")

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="car-manager-panel",
        module_url=f"{PANEL_FILES_URL}/{PANEL_JS_FILE}?v={version}",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        require_admin=False,
        config={"version": version},
        embed_iframe=False,
    )

    # Make the Lovelace card available on dashboards as `custom:car-manager-card`.
    try:
        frontend.add_extra_js_url(hass, f"{PANEL_FILES_URL}/car-manager-card.js?v={version}")
    except Exception as err:  # noqa: BLE001 - never block setup on the optional card
        _LOGGER.debug("Could not register Car Manager card: %s", err)

    domain_data["frontend_registered"] = True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
        async_unregister_services(hass)
        hass.data.pop(DOMAIN, None)

    return unload_ok
