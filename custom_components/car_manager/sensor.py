"""Sensor platform for Car Manager.

Per-vehicle entities (days remaining for each legal obligation, mileage, next
service) plus fleet-wide rollups. Entities are created dynamically as cars are
added in the panel.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, LEGAL_FIELDS, LEGAL_LABELS, SIGNAL_CARS_CHANGED
from .coordinator import CarManagerCoordinator
from .entity import CarManagerCarEntity, CarManagerFleetEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: CarManagerCoordinator = hass.data[DOMAIN]["coordinator"]
    known: set[str] = set()

    @callback
    def _add_new_cars() -> None:
        new_entities: list[SensorEntity] = []
        for car in (coordinator.data or {}).get("cars", []):
            car_id = car.get("id")
            if not car_id or car_id in known:
                continue
            known.add(car_id)
            name = car.get("name") or "Mașină"
            for field in LEGAL_FIELDS:
                new_entities.append(LegalSensor(coordinator, car_id, name, field))
            new_entities.append(MileageSensor(coordinator, car_id, name))
            new_entities.append(NextServiceSensor(coordinator, car_id, name))
        if new_entities:
            async_add_entities(new_entities)

    # fleet sensors once
    async_add_entities(
        [
            FleetStatusSensor(coordinator),
            FleetCarsSensor(coordinator),
            FleetAlertsSensor(coordinator),
            FleetCostYearSensor(coordinator),
        ]
    )

    _add_new_cars()
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_CARS_CHANGED, _add_new_cars))


class LegalSensor(CarManagerCarEntity, SensorEntity):
    """Days remaining for one legal obligation (RCA / ITP / rovinietă / CASCO)."""

    _attr_native_unit_of_measurement = "zile"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, car_id, car_name, field: str) -> None:
        super().__init__(coordinator, car_id, car_name)
        self._field = field
        self._attr_name = LEGAL_LABELS[field]
        self._attr_unique_id = f"{DOMAIN}_{car_id}_{field}"
        self._attr_icon = "mdi:shield-car"

    @property
    def native_value(self) -> int | None:
        view = self.car_view
        if not view:
            return None
        return view["legal"][self._field]["zile_ramase"]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view = self.car_view
        if not view:
            return {}
        info = view["legal"][self._field]
        return {
            "expira": info["expira"],
            "configurat": info["configured"],
            "expirat": info["expired"],
            "alerta": info["alert"],
        }


class MileageSensor(CarManagerCarEntity, SensorEntity):
    _attr_native_unit_of_measurement = "km"
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_icon = "mdi:counter"

    def __init__(self, coordinator, car_id, car_name) -> None:
        super().__init__(coordinator, car_id, car_name)
        self._attr_name = "Kilometraj"
        self._attr_unique_id = f"{DOMAIN}_{car_id}_mileage"

    @property
    def native_value(self) -> int | None:
        view = self.car_view
        return view["mileage"] if view else None


class NextServiceSensor(CarManagerCarEntity, SensorEntity):
    """Days until the soonest-due maintenance item."""

    _attr_native_unit_of_measurement = "zile"
    _attr_icon = "mdi:wrench-clock"

    def __init__(self, coordinator, car_id, car_name) -> None:
        super().__init__(coordinator, car_id, car_name)
        self._attr_name = "Următoarea revizie"
        self._attr_unique_id = f"{DOMAIN}_{car_id}_next_service"

    def _soonest(self) -> dict[str, Any] | None:
        view = self.car_view
        if not view:
            return None
        candidates = [
            info
            for info in view["service"].values()
            if info.get("days_remaining") is not None
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda i: i["days_remaining"])

    @property
    def native_value(self) -> int | None:
        soonest = self._soonest()
        return soonest["days_remaining"] if soonest else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view = self.car_view
        if not view:
            return {}
        return {
            "elemente": {k: v for k, v in view["service"].items()},
        }


class FleetStatusSensor(CarManagerFleetEntity, SensorEntity):
    _attr_icon = "mdi:fleet"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_name = "Stare flotă"
        self._attr_unique_id = f"{DOMAIN}_fleet_status"

    @property
    def native_value(self) -> str:
        return self.fleet.get("status", "OK")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "alerte": self.fleet.get("alerts", 0),
            "critice": self.fleet.get("critical", 0),
        }


class FleetCarsSensor(CarManagerFleetEntity, SensorEntity):
    _attr_icon = "mdi:car-multiple"
    _attr_native_unit_of_measurement = "mașini"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_name = "Mașini"
        self._attr_unique_id = f"{DOMAIN}_fleet_cars"

    @property
    def native_value(self) -> int:
        return self.fleet.get("cars", 0)


class FleetAlertsSensor(CarManagerFleetEntity, SensorEntity):
    _attr_icon = "mdi:alert-circle"
    _attr_native_unit_of_measurement = "alerte"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_name = "Alerte"
        self._attr_unique_id = f"{DOMAIN}_fleet_alerts"

    @property
    def native_value(self) -> int:
        return self.fleet.get("alerts", 0)


class FleetCostYearSensor(CarManagerFleetEntity, SensorEntity):
    _attr_icon = "mdi:cash-multiple"
    _attr_native_unit_of_measurement = "RON"
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_name = "Cost an curent"
        self._attr_unique_id = f"{DOMAIN}_fleet_cost_year"

    @property
    def native_value(self) -> float:
        return self.fleet.get("cost_year", 0)
