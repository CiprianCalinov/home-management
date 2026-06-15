"""Shared entity helpers for Car Manager."""

from __future__ import annotations

from typing import Any

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, PANEL_TITLE
from .coordinator import CarManagerCoordinator


def find_car_view(coordinator: CarManagerCoordinator, car_id: str) -> dict[str, Any] | None:
    for car in (coordinator.data or {}).get("cars", []):
        if car.get("id") == car_id:
            return car
    return None


class CarManagerCarEntity(CoordinatorEntity[CarManagerCoordinator]):
    """Base for entities bound to a single vehicle."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: CarManagerCoordinator, car_id: str, car_name: str) -> None:
        super().__init__(coordinator)
        self._car_id = car_id
        self._car_name = car_name

    @property
    def car_view(self) -> dict[str, Any] | None:
        return find_car_view(self.coordinator, self._car_id)

    @property
    def available(self) -> bool:
        return self.car_view is not None

    @property
    def device_info(self) -> DeviceInfo:
        view = self.car_view
        name = view["name"] if view else self._car_name
        return DeviceInfo(
            identifiers={(DOMAIN, self._car_id)},
            name=name,
            manufacturer="Car Manager",
            model=(view or {}).get("make") or "Vehicul",
        )


class CarManagerFleetEntity(CoordinatorEntity[CarManagerCoordinator]):
    """Base for fleet-wide entities."""

    _attr_has_entity_name = True

    @property
    def fleet(self) -> dict[str, Any]:
        return (self.coordinator.data or {}).get("fleet", {})

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, "fleet")},
            name=f"{PANEL_TITLE} (flotă)",
            manufacturer="Car Manager",
            model="Flotă",
        )
