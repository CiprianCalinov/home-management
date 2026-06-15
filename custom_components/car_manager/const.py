"""Constants for the Car Manager integration."""

from __future__ import annotations

DOMAIN = "car_manager"
PLATFORMS = ["sensor", "binary_sensor"]

# Storage
STORAGE_KEY = "car_manager_data"
STORAGE_VERSION = 1

# Frontend panel
PANEL_URL_PATH = "car-manager"
PANEL_TITLE = "Car Manager"
PANEL_ICON = "mdi:car-multiple"
PANEL_FILES_URL = "/car_manager_files"
PANEL_JS_FILE = "car-manager-panel.js"

# Dispatcher signals
SIGNAL_DATA_UPDATED = f"{DOMAIN}_data_updated"
SIGNAL_CARS_CHANGED = f"{DOMAIN}_cars_changed"

# Legal-obligation keys (data + sensor suffixes)
LEGAL_FIELDS = ["rca", "itp", "rovinieta", "casco"]
LEGAL_LABELS = {
    "rca": "RCA",
    "itp": "ITP",
    "rovinieta": "Rovinietă",
    "casco": "CASCO",
}

# Service / maintenance items with default intervals (km, days).
# 0 / None means "not interval based" -> only date or only km used as configured.
SERVICE_ITEMS = {
    "revizie": {"label": "Revizie", "interval_km": 15000, "interval_days": 365},
    "ulei": {"label": "Ulei motor", "interval_km": 15000, "interval_days": 365},
    "distributie": {"label": "Distribuție", "interval_km": 90000, "interval_days": 1825},
    "lichid_frana": {"label": "Lichid frână", "interval_km": 0, "interval_days": 730},
    "antigel": {"label": "Antigel", "interval_km": 0, "interval_days": 1460},
    "filtru_polen": {"label": "Filtru polen", "interval_km": 15000, "interval_days": 365},
}

# Equipment items (expiry-date based or simple boolean presence)
EQUIPMENT_DATE_ITEMS = {
    "trusa_medicala": "Trusă medicală",
    "stingator": "Stingător",
}
EQUIPMENT_BOOL_ITEMS = {
    "vesta": "Vestă reflectorizantă",
    "triunghi": "Triunghi reflectorizant",
}

# Cost categories
COST_CATEGORIES = {
    "service": "Service / Intervenție",
    "combustibil": "Combustibil",
    "asigurare": "Asigurare",
    "taxe": "Taxe",
    "anvelope": "Anvelope",
    "altele": "Altele",
}

# Alert thresholds (days) for "needs attention"
ALERT_DAYS = 30
ALERT_KM = 1000

# Default notify thresholds (days before expiry)
DEFAULT_NOTIFY_DAYS = [30, 7, 1]
