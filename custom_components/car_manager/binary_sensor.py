"""Binary sensor platform for Car Manager.

One "needs attention" entity per vehicle, on when any legal obligation or
maintenance item is within its alert threshold.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SIGNAL_CARS_CHANGED
from .coordinator import CarManagerCoordinator
from .entity import CarManagerCarEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: CarManagerCoordinator = hass.data[DOMAIN]["coordinator"]
    known: set[str] = set()

    @callback
    def _add_new_cars() -> None:
        new_entities: list[BinarySensorEntity] = []
        for car in (coordinator.data or {}).get("cars", []):
            car_id = car.get("id")
            if not car_id or car_id in known:
                continue
            known.add(car_id)
            new_entities.append(AttentionSensor(coordinator, car_id, car.get("name") or "Mașină"))
        if new_entities:
            async_add_entities(new_entities)

    _add_new_cars()
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_CARS_CHANGED, _add_new_cars))


class AttentionSensor(CarManagerCarEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _attr_icon = "mdi:car-wrench"

    def __init__(self, coordinator, car_id, car_name) -> None:
        super().__init__(coordinator, car_id, car_name)
        self._attr_name = "Necesită atenție"
        self._attr_unique_id = f"{DOMAIN}_{car_id}_attention"

    @property
    def is_on(self) -> bool:
        view = self.car_view
        return bool(view and view["attention"])

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view = self.car_view
        if not view:
            return {}
        return {"atentionari": view["attention"]}
