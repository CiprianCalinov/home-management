/**
 * Car Manager — Home Assistant sidebar panel.
 *
 * Self-contained web component (no build step). Talks to the backend through
 * the car_manager/* websocket commands. Loads once, re-renders after each
 * mutation from the snapshot the backend returns.
 */

const LEGAL_DEFS = [
  { key: "rca", label: "RCA", hasStart: true, aida: true },
  { key: "itp", label: "ITP" },
  { key: "rovinieta", label: "Rovinietă" },
  { key: "casco", label: "CASCO", hasStart: true },
];

const SERVICE_DEFS = [
  { key: "revizie", label: "Revizie", km: true, date: true },
  { key: "ulei", label: "Ulei motor", km: true, date: true },
  { key: "distributie", label: "Distribuție", km: true, date: true },
  { key: "filtru_polen", label: "Filtru polen", km: true, date: true },
  { key: "lichid_frana", label: "Lichid frână", km: false, date: true },
  { key: "antigel", label: "Antigel", km: false, date: true },
];

const SERVICE_INTERVALS = {
  revizie: { interval_km: 15000, interval_days: 365 },
  ulei: { interval_km: 15000, interval_days: 365 },
  distributie: { interval_km: 90000, interval_days: 1825 },
  filtru_polen: { interval_km: 15000, interval_days: 365 },
  lichid_frana: { interval_km: 0, interval_days: 730 },
  antigel: { interval_km: 0, interval_days: 1460 },
};

const COST_CATEGORIES = [
  ["service", "Service / Intervenție"],
  ["combustibil", "Combustibil"],
  ["asigurare", "Asigurare"],
  ["taxe", "Taxe"],
  ["anvelope", "Anvelope"],
  ["altele", "Altele"],
];

const DOC_KINDS = [
  ["talon", "Talon"],
  ["rca", "RCA"],
  ["itp", "ITP"],
  ["rovinieta", "Rovinietă"],
  ["casco", "CASCO"],
  ["asigurare", "Altă asigurare"],
  ["altele", "Alt document"],
];

const TABS = [
  ["acasa", "Acasă", "home"],
  ["masini", "Mașini", "car"],
  ["costuri", "Costuri", "wallet"],
  ["statistici", "Statistici", "chart"],
  ["setari", "Setări", "settings"],
];

const TIRE_SEASONS = ["", "vară", "iarnă", "all-season"];

// Fallback dacă panoul nu primește versiunea din config (ex. în preview).
const PANEL_VERSION = "0.9.0";

// Set propriu de iconițe line (24x24, stroke=currentColor) — fără emoji.
const ICONS = {
  home: '<path d="M3 11.4 12 4l9 7.4"/><path d="M5.5 10v9.5h13V10"/>',
  car: '<path d="M5 11l1.7-4.3A2 2 0 0 1 8.6 5.4h6.8a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3.5" y="11" width="17" height="5.5" rx="1.5"/><circle cx="7.6" cy="16.6" r="1.6"/><circle cx="16.4" cy="16.6" r="1.6"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.2" r="1.2"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 16v-4"/><path d="M12 16V9"/><path d="M16 16v-6"/>',
  fuel: '<path d="M6.5 20V6.5A2.5 2.5 0 0 1 9 4h3a2.5 2.5 0 0 1 2.5 2.5V20"/><path d="M5 20h11"/><path d="M8.5 9.5h4"/><path d="M14.5 8l2.6 2.2v6.3a1.45 1.45 0 0 0 2.9 0V11l-2-2"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21"/>',
  kit: '<rect x="3" y="7" width="18" height="12.5" rx="2.5"/><path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7"/><path d="M12 11v4.5M9.75 13.25h4.5"/>',
  battery: '<rect x="2.5" y="8" width="16" height="9" rx="2.5"/><path d="M21 11v3"/><path d="M6.5 11v3M10 11v3M13.5 11v3"/>',
  settings: '<path d="M4 7h8M16 7h4"/><path d="M4 12h2M10 12h10"/><path d="M4 17h6M14 17h6"/><circle cx="14" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="12" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17l-1 3z"/><path d="M14 7.5l2.8 2.8"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.5 7l1 12.3a1.2 1.2 0 0 0 1.2 1.1h6.6a1.2 1.2 0 0 0 1.2-1.1L18.5 7"/>',
  camera: '<path d="M4 9.5a2 2 0 0 1 2-2h1.6L9 5.5h6l1.4 2H18a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13.2" r="3.2"/>',
  shield: '<path d="M12 3.2l7 2.8v5c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.2"/><path d="M12 16.3h.02"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  fwd: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  doc: '<path d="M7 3h7l5 5v12.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V3.5A.5.5 0 0 1 7 3z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h6"/>',
  sparkle: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/>',
};
function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

// Listă curată de mărci → modele (focus piața RO). „Altă marcă" / „Alt model"
// permit scriere liberă pentru ce nu e în listă.
const CAR_MAKES = {
  Dacia: ["Logan", "Sandero", "Duster", "Spring", "Jogger", "Lodgy", "Dokker", "Logan MCV"],
  Volkswagen: ["Golf", "Passat", "Polo", "Tiguan", "Touran", "T-Roc", "T-Cross", "Arteon", "Up", "Caddy", "Sharan", "Jetta"],
  Skoda: ["Octavia", "Fabia", "Superb", "Kodiaq", "Karoq", "Rapid", "Scala", "Kamiq", "Roomster", "Yeti"],
  Renault: ["Clio", "Megane", "Captur", "Kadjar", "Scenic", "Laguna", "Talisman", "Koleos", "Twingo", "Espace"],
  Ford: ["Focus", "Fiesta", "Mondeo", "Kuga", "Puma", "EcoSport", "C-Max", "S-Max", "Galaxy", "Transit"],
  Opel: ["Astra", "Corsa", "Insignia", "Mokka", "Zafira", "Vectra", "Meriva", "Crossland", "Grandland"],
  BMW: ["Seria 1", "Seria 2", "Seria 3", "Seria 4", "Seria 5", "Seria 6", "Seria 7", "X1", "X3", "X5", "X6"],
  "Mercedes-Benz": ["Clasa A", "Clasa B", "Clasa C", "Clasa E", "Clasa S", "GLA", "GLC", "GLE", "CLA", "Vito", "Sprinter"],
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8"],
  Toyota: ["Aygo", "Yaris", "Corolla", "Auris", "C-HR", "RAV4", "Avensis", "Camry", "Hilux", "Proace"],
  Hyundai: ["i10", "i20", "i30", "Tucson", "Kona", "Santa Fe", "ix35", "Accent", "Bayon"],
  Kia: ["Picanto", "Rio", "Ceed", "Sportage", "Sorento", "Stonic", "Niro", "XCeed"],
  Peugeot: ["208", "308", "508", "2008", "3008", "5008", "207", "307", "Partner", "Rifter"],
  "Citroën": ["C1", "C3", "C4", "C5", "Berlingo", "C3 Aircross", "C4 Cactus", "C-Elysée"],
  Fiat: ["500", "Panda", "Punto", "Tipo", "Doblo", "500X", "500L"],
  Nissan: ["Micra", "Qashqai", "Juke", "X-Trail", "Note", "Leaf", "Navara"],
  Honda: ["Civic", "Accord", "CR-V", "Jazz", "HR-V"],
  Mazda: ["2", "3", "6", "CX-3", "CX-30", "CX-5"],
  Volvo: ["V40", "V60", "V90", "XC40", "XC60", "XC90", "S60", "S90"],
  Seat: ["Ibiza", "Leon", "Ateca", "Arona", "Toledo", "Alhambra"],
  Suzuki: ["Swift", "Vitara", "SX4", "Ignis", "Jimny", "Baleno"],
  Mitsubishi: ["ASX", "Outlander", "Lancer", "Space Star", "L200"],
  Chevrolet: ["Spark", "Aveo", "Cruze", "Captiva", "Orlando"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
};

// WMI (primele 3 caractere din VIN) → marcă. Acoperire pentru mărci uzuale în RO.
const WMI_MAKE = {
  UU1: "Dacia", UU5: "Dacia", UU6: "Dacia",
  VF1: "Renault", VF2: "Renault", VF6: "Renault",
  WVW: "Volkswagen", WV1: "Volkswagen", WV2: "Volkswagen", WVG: "Volkswagen", "1VW": "Volkswagen", "3VW": "Volkswagen",
  TMB: "Skoda", TMP: "Skoda",
  WF0: "Ford", "1FA": "Ford", "2FA": "Ford",
  W0L: "Opel", W0V: "Opel",
  WBA: "BMW", WBS: "BMW", WBY: "BMW", "4US": "BMW", "5UX": "BMW",
  WDB: "Mercedes-Benz", WDD: "Mercedes-Benz", WDC: "Mercedes-Benz", WDF: "Mercedes-Benz", W1K: "Mercedes-Benz", W1V: "Mercedes-Benz",
  WAU: "Audi", WA1: "Audi", TRU: "Audi",
  VF3: "Peugeot",
  VF7: "Citroën",
  ZFA: "Fiat", ZFF: "Fiat",
  SJN: "Nissan", VSK: "Nissan", JN1: "Nissan",
  JHM: "Honda", SHH: "Honda", SHS: "Honda", JHL: "Honda",
  JMZ: "Mazda", JM1: "Mazda",
  YV1: "Volvo", YV4: "Volvo",
  VSS: "Seat",
  TSM: "Suzuki", JSA: "Suzuki",
  JMB: "Mitsubishi", JMY: "Mitsubishi",
  TMA: "Hyundai", KMH: "Hyundai", NLH: "Hyundai",
  KNA: "Kia", KNB: "Kia", KNE: "Kia", U5Y: "Kia", U6Y: "Kia",
  JTD: "Toyota", JTM: "Toyota", SB1: "Toyota", VNK: "Toyota", NMT: "Toyota",
  "5YJ": "Tesla", "7SA": "Tesla", LRW: "Tesla",
};

// Caracterul 10 din VIN = anul modelului (ciclu de 30 ani, fără I,O,Q,U,Z,0).
const VIN_YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";
function vinModelYear(ch) {
  if (!ch) return null;
  const i = VIN_YEAR_CODES.indexOf(String(ch).toUpperCase());
  if (i < 0) return null;
  const now = new Date().getFullYear();
  let y = 1980 + i;
  while (y + 30 <= now + 1) y += 30;
  return y;
}

const fmtRon = (n) =>
  `${Number(n || 0).toLocaleString("ro-RO", { maximumFractionDigits: 0 })} RON`;
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

class CarManagerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab = "acasa";
    this._selected = "all";
    this._editing = null; // car object being edited, or null
    this._data = null;
    this._loaded = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) {
      this._loaded = true;
      this._load();
    }
  }

  get hass() {
    return this._hass;
  }

  set panel(p) {
    this._panel = p;
  }

  get panel() {
    return this._panel;
  }

  _version() {
    return (this._panel && this._panel.config && this._panel.config.version) || PANEL_VERSION;
  }

  async _call(type, payload = {}) {
    return this._hass.connection.sendMessagePromise({
      type: `car_manager/${type}`,
      ...payload,
    });
  }

  async _load() {
    try {
      this._data = await this._call("get_data");
    } catch (err) {
      this._data = { error: String(err) };
    }
    this._render();
  }

  // ----------------------------------------------------------- mutations
  async _mutate(type, payload) {
    try {
      this._data = await this._call(type, payload);
    } catch (err) {
      this._toast(`Eroare: ${err}`);
      return;
    }
    this._render();
  }

  _toast(msg) {
    const ev = new Event("hass-notification", { bubbles: true, composed: true });
    ev.detail = { message: msg };
    this.dispatchEvent(ev);
  }

  // ----------------------------------------------------------- render
  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = `${this._styles()}<div class="loading">Se încarcă…</div>`;
      return;
    }
    if (this._data.error) {
      this.shadowRoot.innerHTML = `${this._styles()}<div class="loading">Eroare: ${esc(
        this._data.error
      )}</div>`;
      return;
    }

    const view = this._data.view;
    const fleet = view.fleet;

    this.shadowRoot.innerHTML = `
      ${this._styles()}
      <div class="wrap">
        ${this._header(fleet)}
        <div class="body">${this._tabContent()}</div>
        ${this._tabbar()}
      </div>
    `;
    this._attach();
  }

  _header(fleet) {
    const ok = fleet.status === "OK";
    return `
      <header class="hero">
        <div class="hero-row">
          <div class="hero-id">
            <div class="logo">${icon("car", 28)}</div>
            <div>
              <div class="brand">Car Manager</div>
              <h1>Garajul meu</h1>
            </div>
          </div>
          <div class="status-pill ${ok ? "ok" : "warn"}">
            <span class="status-dot"></span>${ok ? "Totul e în regulă" : esc(fleet.status)}
          </div>
        </div>
        <div class="hero-stats">
          ${this._hstat("car", fleet.cars, "mașini")}
          ${this._hstat("alert", fleet.alerts, "alerte", fleet.alerts ? "warn" : "")}
          ${
            this._tab === "masini"
              ? this._hstat("calendar", fmtRon(fleet.cost_month), "luna aceasta") +
                this._hstat("wallet", fmtRon(fleet.cost_year), "anul curent")
              : this._hstat("shield", fleet.critical, "critice", fleet.critical ? "danger" : "") +
                this._hstat("calendar", fmtRon(fleet.cost_month), "luna aceasta")
          }
        </div>
      </header>`;
  }

  _hstat(ic, val, label, tone = "") {
    return `<div class="hstat ${tone}">
      <div class="hstat-ic">${icon(ic, 19)}</div>
      <div class="hstat-meta"><div class="hstat-val">${esc(val)}</div><div class="hstat-label">${esc(label)}</div></div>
    </div>`;
  }

  _tabbar() {
    return `<nav class="tabs">${TABS.map(
      ([id, label, ic]) =>
        `<button data-tab="${id}" class="tab ${
          this._tab === id ? "active" : ""
        }">${icon(ic, 22)}<span>${label}</span></button>`
    ).join("")}</nav>`;
  }

  _tabContent() {
    switch (this._tab) {
      case "acasa":
        return this._home();
      case "masini":
        if (this._editing) return this._carForm();
        if (this._detailCar) return this._carDetail(this._detailCar);
        return this._cars();
      case "costuri":
        return this._costs();
      case "statistici":
        return this._stats();
      case "setari":
        return this._settings();
      default:
        return "";
    }
  }

  // ----------------------------------------------------------- ACASĂ
  _home() {
    const view = this._data.view;
    const costs = view.costs;
    const cars = view.cars;
    if (!cars.length) return this._emptyState();

    const allAlerts = [];
    cars.forEach((c) =>
      c.attention.forEach((a) => allAlerts.push({ car: c.name, ...a }))
    );

    return `
      <section class="card">
        <div class="overline">ACASĂ</div>
        <h2>Privire de ansamblu</h2>
        <div class="kpis">
          ${this._kpi("Cheltuieli luna asta", fmtRon(costs.grand_month), "toate")}
          ${this._kpi("Combustibil luna", fmtRon(costs.fuel_month), "")}
          ${this._kpi("Alerte", view.fleet.alerts, `${view.fleet.critical} critice`)}
          ${this._kpi("Autovehicule", cars.length, "mașini")}
        </div>
      </section>

      <section class="card">
        <div class="row-between">
          <div class="overline">AUTOVEHICULE</div>
          <button class="btn primary" data-action="add-car">${icon("plus", 16)} Adaugă autovehicul</button>
        </div>
        <div class="car-grid">
          ${cars.map((c) => this._carCard(c)).join("")}
        </div>
      </section>

      ${this._planner()}

      <section class="card">
        <div class="overline">ATENȚIONĂRI RAPIDE</div>
        <h3>Ce trebuie urmărit</h3>
        ${
          allAlerts.length
            ? allAlerts
                .map(
                  (a) => `
          <div class="alert-row ${a.severity}">
            <div>
              <strong>${esc(a.label)}</strong>
              <div class="muted">${esc(a.car)} — ${this._alertWhen(a)}</div>
            </div>
            <span class="pill ${a.severity}">${a.severity === "critic" ? "Critic" : "Atenție"}</span>
          </div>`
                )
                .join("")
            : `<div class="muted">Totul e în regulă. Niciun termen aproape de expirare. ✅</div>`
        }
      </section>`;
  }

  _carCard(c) {
    const chips = LEGAL_DEFS.filter((d) => c.legal[d.key].configured)
      .map((d) => {
        const info = c.legal[d.key];
        return `<div class="chip ${this._chipClass(info)}">
        <div class="chip-label">${d.label}</div>
        <div class="chip-val">${this._chipText(info)}</div>
      </div>`;
      })
      .join("");

    const crit = c.attention.filter((a) => a.severity === "critic").length;
    const badge = c.attention.length
      ? `<span class="alert-badge ${crit ? "critic" : "atentie"}">${icon("alert", 13)} ${c.attention.length}</span>`
      : `<span class="alert-badge ok">${icon("check", 13)} OK</span>`;

    return `
      <div class="car" data-action="open-car" data-id="${c.id}">
        <div class="row-between">
          <div class="car-name">${icon("car", 18)} ${esc(c.name)} ${badge}</div>
          <div class="car-actions">
            <button class="icon-btn" data-action="edit-car" data-id="${c.id}" title="Editează">${icon("edit", 16)}</button>
            <button class="icon-btn" data-action="del-car" data-id="${c.id}" title="Șterge">${icon("trash", 16)}</button>
          </div>
        </div>
        <div class="muted small">${esc(c.make || "")} ${esc(c.model || "")} · ${
      c.mileage ? c.mileage.toLocaleString("ro-RO") + " km" : "—"
    }</div>
        ${chips ? `<div class="chips">${chips}</div>` : `<div class="muted small" style="margin-top:8px">Niciun termen adăugat</div>`}
        <div class="car-cta muted small">Detalii ${icon("back", 13)}</div>
      </div>`;
  }

  // ----------------------------------------------------------- MAȘINI list
  _cars() {
    const cars = this._data.view.cars;
    return `
      <section class="card">
        <div class="row-between">
          <div><div class="overline">MAȘINI</div><h2>Autovehiculele tale</h2></div>
          <button class="btn primary" data-action="add-car">${icon("plus", 16)} Adaugă autovehicul</button>
        </div>
        ${
          cars.length
            ? `<div class="car-grid">${cars.map((c) => this._carCard(c)).join("")}</div>`
            : this._emptyState()
        }
      </section>`;
  }

  // ----------------------------------------------------------- car FORM
  _carForm() {
    const e = this._editing;
    e.legal = e.legal || {};
    e.service = e.service || {};
    e.equipment = e.equipment || {};
    e.battery = e.battery || {};
    e.interventions = e.interventions || [];
    const isNew = !e.id;

    return `
      <section class="card">
        <div class="overline">${isNew ? "ADAUGĂ" : "EDITEAZĂ"}</div>
        <h2>${isNew ? "Autovehicul nou" : esc(e.name || "Autovehicul")}</h2>

        <h3>Date generale</h3>
        ${this._identityGrid(e)}
        <div class="form-actions" style="justify-content:flex-start">
          <button class="btn" type="button" data-action="scan-talon">${icon("camera", 16)} Scanează talonul</button>
        </div>

        <h3>Termene legale <span class="hint">bifează ce are mașina</span></h3>
        ${this._legalSection(e)}

        <h3>Revizii & consumabile <span class="hint">bifează ce urmărești</span></h3>
        ${this._serviceSection(e)}

        <h3>Dotări obligatorii <span class="hint">bifează ce ai în mașină</span></h3>
        ${this._equipmentSection(e)}

        <h3>Baterie</h3>
        ${this._batterySection(e)}

        <h3>Alte intervenții <span class="hint">istoric reparații / piese</span></h3>
        ${this._interventionsSection(e)}

        <h3>Anvelope</h3>
        <div class="form-grid">
          <label>Sezon
            <select data-f="tires.season">
              ${["", "vară", "iarnă", "all-season"]
                .map(
                  (s) =>
                    `<option value="${s}" ${
                      (e.tires && e.tires.season) === s ? "selected" : ""
                    }>${s || "—"}</option>`
                )
                .join("")}
            </select>
          </label>
          <label>Profil față (mm)<input type="number" step="0.1" data-f="tires.front_mm" value="${
            (e.tires && e.tires.front_mm) ?? ""
          }"></label>
          <label>Profil spate (mm)<input type="number" step="0.1" data-f="tires.rear_mm" value="${
            (e.tires && e.tires.rear_mm) ?? ""
          }"></label>
          <label>Data schimbării<input type="date" data-f="tires.change_date" value="${esc(
            (e.tires && e.tires.change_date) || ""
          )}"></label>
        </div>

        <div class="form-actions">
          <button class="btn" data-action="cancel-car">Anulează</button>
          <button class="btn primary" data-action="save-car">${isNew ? "Adaugă" : "Salvează"}</button>
        </div>
      </section>`;
  }

  _identityGrid(e) {
    const make = e.make || "";
    const model = e.model || "";
    const makeKnown = Object.prototype.hasOwnProperty.call(CAR_MAKES, make);
    const makeOther = make !== "" && !makeKnown;
    const makeOpts =
      `<option value="">— alege —</option>` +
      Object.keys(CAR_MAKES)
        .map((k) => `<option value="${esc(k)}" ${k === make ? "selected" : ""}>${esc(k)}</option>`)
        .join("") +
      `<option value="__other__" ${makeOther ? "selected" : ""}>Altă marcă…</option>`;
    const models = makeKnown ? CAR_MAKES[make] : [];
    const modelOther = model !== "" && !models.includes(model);
    const modelOpts =
      `<option value="">— alege —</option>` +
      models.map((m) => `<option ${m === model ? "selected" : ""}>${esc(m)}</option>`).join("") +
      `<option value="__other__" ${modelOther ? "selected" : ""}>Alt model…</option>`;

    return `
      <div class="form-grid">
        <label>Nume<input data-f="name" value="${esc(e.name || "")}" placeholder="ex. Logan"></label>
        <label>Marcă<select id="f-make-select">${makeOpts}</select></label>
        <label id="f-make-custom-wrap" style="display:${makeOther ? "" : "none"}">Marcă (scrie)
          <input id="f-make-custom" value="${makeOther ? esc(make) : ""}" placeholder="ex. Lada"></label>
        <label>Model<select id="f-model-select">${modelOpts}</select></label>
        <label id="f-model-custom-wrap" style="display:${modelOther ? "" : "none"}">Model (scrie)
          <input id="f-model-custom" value="${modelOther ? esc(model) : ""}" placeholder="ex. Niva"></label>
        <label>Nr. înmatriculare<input data-f="plate" value="${esc(e.plate || "")}" placeholder="B 123 ABC"></label>
        <label>VIN (serie șasiu)
          <span class="vin-row">
            <input data-f="vin" id="f-vin" value="${esc(e.vin || "")}" placeholder="17 caractere" maxlength="17">
            <button class="btn" type="button" data-action="decode-vin">Decodează</button>
          </span>
        </label>
        <label>An<input type="number" data-f="year" id="f-year" value="${e.year ?? ""}"></label>
        <label>Kilometraj<input type="number" data-f="mileage" value="${e.mileage ?? ""}"></label>
      </div>`;
  }

  // Switch elegant + corp care apare doar când e bifat.
  _discRow(id, label, on, bodyHtml) {
    return `
      <div class="disc-row ${on ? "on" : ""}">
        <label class="switch">
          <input type="checkbox" class="cm-toggle" data-target="${id}" ${on ? "checked" : ""}>
          <span class="switch-track"><span class="switch-thumb"></span></span>
          <span class="switch-label">${label}</span>
        </label>
        ${
          bodyHtml
            ? `<div class="disc-body" id="${id}" ${on ? "" : 'style="display:none"'}>${bodyHtml}</div>`
            : ""
        }
      </div>`;
  }

  _eqDate(v) {
    if (v && typeof v === "object") return { has: !!(v.has || v.expira), expira: v.expira || "" };
    if (typeof v === "string" && v) return { has: true, expira: v };
    return { has: false, expira: "" };
  }

  _legalSection(e) {
    const legal = e.legal || {};
    return `<div class="disc-list">${LEGAL_DEFS.map((d) => {
      const end = legal[d.key] || "";
      const start = legal[`${d.key}_start`] || "";
      const body = d.hasStart
        ? `<label class="inline">Început <input type="date" id="legstart-${d.key}" value="${esc(start)}"></label>
           <label class="inline">Expiră <input type="date" id="legdate-${d.key}" value="${esc(end)}"></label>
           ${
             d.aida
               ? `<button class="btn" type="button" data-action="verify-rca">${icon("shield", 16)} Verifică pe aida.info.ro</button>`
               : ""
           }`
        : `<label class="inline">Expiră la <input type="date" id="legdate-${d.key}" value="${esc(end)}"></label>`;
      return this._discRow(`leg-${d.key}`, d.label, !!(end || start), body);
    }).join("")}</div>`;
  }

  _serviceSection(e) {
    const service = e.service || {};
    return `<div class="disc-list">${SERVICE_DEFS.map((d) => {
      const s = service[d.key] || {};
      const on = !!(s.last_date || s.last_km != null);
      const body = `
        ${
          d.date
            ? `<label class="inline">Ultima dată <input type="date" id="svcdate-${d.key}" value="${esc(
                s.last_date || ""
              )}"></label>`
            : ""
        }
        ${
          d.km
            ? `<label class="inline">La km <input type="number" id="svckm-${d.key}" value="${
                s.last_km ?? ""
              }"></label>`
            : ""
        }`;
      return this._discRow(`svc-${d.key}`, d.label, on, body);
    }).join("")}</div>`;
  }

  _equipmentSection(e) {
    const eq = e.equipment || {};
    const trusa = this._eqDate(eq.trusa_medicala);
    const sting = this._eqDate(eq.stingator);
    const dateBody = (id, item) =>
      `<label class="inline">Expiră la <input type="date" id="${id}" value="${esc(item.expira)}"></label>`;
    return `<div class="disc-list">
      ${this._discRow("eq-trusa", "Trusă medicală", trusa.has, dateBody("eqdate-trusa", trusa))}
      ${this._discRow("eq-sting", "Stingător", sting.has, dateBody("eqdate-sting", sting))}
      ${this._discRow("eq-vesta", "Vestă reflectorizantă", !!eq.vesta, "")}
      ${this._discRow("eq-triunghi", "Triunghi reflectorizant", !!eq.triunghi, "")}
    </div>`;
  }

  _batterySection(e) {
    const b = e.battery || {};
    const on = !!(b.has || b.install_date);
    const body = `
      <label class="inline">Data montării <input type="date" id="bat-date" value="${esc(
        b.install_date || ""
      )}"></label>
      <label class="inline">Garanție (luni) <input type="number" id="bat-warr" value="${
        b.warranty_months ?? 48
      }"></label>`;
    return `<div class="disc-list">${this._discRow("bat", "Mașina are baterie urmărită", on, body)}</div>`;
  }

  _collectLegal() {
    const legal = {};
    LEGAL_DEFS.forEach((d) => {
      const cb = this.shadowRoot.querySelector(`.cm-toggle[data-target="leg-${d.key}"]`);
      const on = cb && cb.checked;
      const dt = this.shadowRoot.getElementById(`legdate-${d.key}`);
      legal[d.key] = on && dt && dt.value ? dt.value : null;
      if (d.hasStart) {
        const st = this.shadowRoot.getElementById(`legstart-${d.key}`);
        legal[`${d.key}_start`] = on && st && st.value ? st.value : null;
      }
    });
    return legal;
  }

  _collectService() {
    const service = {};
    SERVICE_DEFS.forEach((d) => {
      const cb = this.shadowRoot.querySelector(`.cm-toggle[data-target="svc-${d.key}"]`);
      if (!cb || !cb.checked) return;
      const dateEl = this.shadowRoot.getElementById(`svcdate-${d.key}`);
      const kmEl = this.shadowRoot.getElementById(`svckm-${d.key}`);
      const item = { ...(SERVICE_INTERVALS[d.key] || {}) };
      if (dateEl && dateEl.value) item.last_date = dateEl.value;
      if (kmEl && kmEl.value !== "") item.last_km = Number(kmEl.value);
      if (item.last_date || item.last_km != null) service[d.key] = item;
    });
    return service;
  }

  _collectEquipment() {
    const cb = (id) => this.shadowRoot.querySelector(`.cm-toggle[data-target="${id}"]`);
    const val = (id) => this.shadowRoot.getElementById(id);
    const trusaOn = !!(cb("eq-trusa") && cb("eq-trusa").checked);
    const stingOn = !!(cb("eq-sting") && cb("eq-sting").checked);
    return {
      trusa_medicala: {
        has: trusaOn,
        expira: trusaOn && val("eqdate-trusa") && val("eqdate-trusa").value ? val("eqdate-trusa").value : null,
      },
      stingator: {
        has: stingOn,
        expira: stingOn && val("eqdate-sting") && val("eqdate-sting").value ? val("eqdate-sting").value : null,
      },
      vesta: !!(cb("eq-vesta") && cb("eq-vesta").checked),
      triunghi: !!(cb("eq-triunghi") && cb("eq-triunghi").checked),
    };
  }

  _collectBattery() {
    const cb = this.shadowRoot.querySelector('.cm-toggle[data-target="bat"]');
    const on = !!(cb && cb.checked);
    const dt = this.shadowRoot.getElementById("bat-date");
    const wr = this.shadowRoot.getElementById("bat-warr");
    return {
      has: on,
      install_date: on && dt && dt.value ? dt.value : null,
      warranty_months: wr && wr.value !== "" ? Number(wr.value) : 48,
    };
  }

  _interventionsSection(e) {
    const items = e.interventions || [];
    const rows = items
      .map(
        (it, i) => `
        <div class="int-row" data-int="${i}">
          <div class="int-head">
            <input id="int-${i}-name" placeholder="Nume (ex. Planetară stânga)" value="${esc(it.name || "")}">
            <button class="icon-btn" type="button" data-action="del-intervention" data-idx="${i}" title="Șterge">${icon("trash", 16)}</button>
          </div>
          <div class="int-grid">
            <label>Descriere<input id="int-${i}-desc" value="${esc(it.description || "")}"></label>
            <label>Cost (RON)<input type="number" id="int-${i}-amount" value="${it.amount ?? ""}"></label>
            <label>Data<input type="date" id="int-${i}-date" value="${esc(it.date || "")}"></label>
            <label>La km<input type="number" id="int-${i}-km" value="${it.km ?? ""}"></label>
          </div>
        </div>`
      )
      .join("");
    return `
      <div class="int-list">${rows || `<div class="muted small">Nicio intervenție adăugată încă.</div>`}</div>
      <div class="form-actions" style="justify-content:flex-start">
        <button class="btn" type="button" data-action="add-intervention">${icon("plus", 16)} Adaugă o intervenție</button>
      </div>`;
  }

  _collectInterventions() {
    const out = [];
    this.shadowRoot.querySelectorAll("[data-int]").forEach((row) => {
      const i = row.dataset.int;
      const g = (s) => this.shadowRoot.getElementById(`int-${i}-${s}`);
      const name = g("name") ? g("name").value.trim() : "";
      const desc = g("desc") ? g("desc").value.trim() : "";
      const amount = g("amount") && g("amount").value !== "" ? Number(g("amount").value) : null;
      const date = g("date") && g("date").value ? g("date").value : null;
      const km = g("km") && g("km").value !== "" ? Number(g("km").value) : null;
      if (name || desc || amount != null || date || km != null) {
        out.push({ name, description: desc, amount, date, km });
      }
    });
    return out;
  }

  async _decodeVin() {
    const vinEl = this.shadowRoot.getElementById("f-vin");
    const vin = (vinEl.value || "").trim().toUpperCase();
    vinEl.value = vin;
    if (vin.length !== 17) {
      this._toast("VIN-ul trebuie să aibă exact 17 caractere.");
      return;
    }
    this._toast("Decodez VIN-ul…");
    let make = null;
    let model = null;
    let year = null;
    try {
      const res = await this._call("decode_vin", { vin });
      if (res && res.ok) {
        make = res.make || null;
        model = res.model || null;
        year = res.year || null;
      }
    } catch (err) {
      /* cădem pe decodarea offline */
    }
    // Fallback offline pentru marcă/an dacă serviciul nu le-a întors.
    if (!make) make = WMI_MAKE[vin.slice(0, 3)] || null;
    if (!year) year = vinModelYear(vin[9]);

    this._setMakeModel(make, model);
    if (year) this._setField("f-year", year);

    const parts = [];
    if (make) parts.push(make);
    if (model) parts.push(model);
    if (year) parts.push(year);
    this._toast(
      parts.length
        ? `Din VIN: ${parts.join(", ")}.${model ? "" : " Alege modelul din listă."}`
        : "Nu am putut decoda nimic din acest VIN."
    );
  }

  _editingRaw() {
    if (!this._editing || !this._editing.id) return null;
    return (this._data.raw.cars || {})[this._editing.id] || null;
  }

  // ----------------------------------------------------------- DETALIU MAȘINĂ
  _carDetail(carId) {
    const raw = (this._data.raw.cars || {})[carId];
    const view = this._data.view.cars.find((c) => c.id === carId);
    if (!raw || !view) {
      this._detailCar = null;
      return this._cars();
    }
    const fuel = (this._data.raw.fuel || [])
      .filter((f) => f.car_id === carId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const interventions = (raw.interventions || [])
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const cons = (this._data.view.costs.consumption || {})[carId];
    const entries = this._carCostEntries(carId);
    const carTotal = entries.reduce((s, e) => s + (e.amount || 0), 0);
    const odos = fuel.map((f) => f.odometer).filter(Boolean);
    const kmSpan = odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : 0;
    const costPerKm = kmSpan > 0 ? carTotal / kmSpan : null;
    const docs = raw.documents || [];

    const chips = LEGAL_DEFS.filter((d) => view.legal[d.key].configured)
      .map((d) => {
        const info = view.legal[d.key];
        return `<div class="chip ${this._chipClass(info)}"><div class="chip-label">${d.label}</div><div class="chip-val">${this._chipText(info)}</div></div>`;
      })
      .join("");

    const svc = Object.values(view.service);
    const svcRows = svc.length
      ? svc
          .map(
            (s) =>
              `<div class="line-row"><span>${esc(s.label)}</span><span class="${
                s.alert ? (s.overdue ? "t-danger" : "t-warn") : "muted"
              }">${[
                s.km_remaining != null ? s.km_remaining + " km" : "",
                s.days_remaining != null ? s.days_remaining + " zile" : "",
              ]
                .filter(Boolean)
                .join(" · ")}</span></div>`
          )
          .join("")
      : `<div class="muted small">Nicio revizie urmărită — apasă Editează.</div>`;

    const eq = raw.equipment || {};
    const trusa = this._eqDate(eq.trusa_medicala);
    const sting = this._eqDate(eq.stingator);
    const eqTag = (label, has, extra) =>
      `<span class="tag ${has ? "ok" : "warn"}">${esc(label)} ${has ? "✓" : "✗"}${has && extra ? " · " + esc(extra) : ""}</span>`;
    const tires = raw.tires || {};
    const bat = raw.battery || {};
    let batInfo = "neconfigurată";
    if (bat.install_date) {
      const end = new Date(bat.install_date);
      end.setMonth(end.getMonth() + (bat.warranty_months || 48));
      const days = Math.round((end - new Date()) / 86400000);
      batInfo = `montată ${bat.install_date} · garanție ~${days} zile`;
    }

    return `
      <section class="card">
        <div class="detail-top">
          <button class="btn" data-action="back-detail">${icon("back", 16)} Mașini</button>
          <button class="btn" data-action="edit-car" data-id="${carId}">${icon("edit", 16)} Editează</button>
        </div>
        <div class="detail-head">
          <div class="logo detail-logo">${icon("car", 26)}</div>
          <div>
            <h2>${esc(view.name)}</h2>
            <div class="muted">${esc(raw.make || "")} ${esc(raw.model || "")} ${
      raw.plate ? "· " + esc(raw.plate) : ""
    } · ${view.mileage ? view.mileage.toLocaleString("ro-RO") + " km" : "—"}</div>
          </div>
        </div>
        <h3>Termene legale</h3>
        ${chips ? `<div class="chips">${chips}</div>` : `<div class="muted small">Niciun termen — apasă Editează.</div>`}
        <h3>Revizii & consumabile</h3>
        <div class="lines">${svcRows}</div>
        <h3>Dotări, baterie & anvelope</h3>
        <div class="tags">
          ${eqTag("Trusă", trusa.has, trusa.expira ? "exp. " + trusa.expira : "")}
          ${eqTag("Stingător", sting.has, sting.expira ? "exp. " + sting.expira : "")}
          ${eqTag("Vestă", !!eq.vesta, "")}
          ${eqTag("Triunghi", !!eq.triunghi, "")}
          <span class="tag">${icon("battery", 14)} ${esc(batInfo)}</span>
          ${
            tires.season
              ? `<span class="tag">${icon("tire", 14)} ${esc(tires.season)}${tires.front_mm ? " · " + tires.front_mm + " mm" : ""}</span>`
              : ""
          }
        </div>
      </section>

      <section class="card">
        <h3 style="margin-top:0">${icon("doc", 18)} Documente</h3>
        <p class="muted small">Poze cu talonul, RCA, ITP, rovinieta… la îndemână (stocate privat).</p>
        <div class="form-grid" style="grid-template-columns:1fr auto; align-items:end">
          <label>Tip document<select id="doc-kind">${DOC_KINDS.map(
            ([v, l]) => `<option value="${v}">${esc(l)}</option>`
          ).join("")}</select></label>
          <button class="btn primary" data-action="add-doc" data-id="${carId}">${icon("camera", 16)} Adaugă poză</button>
        </div>
        ${
          docs.length
            ? `<div class="doc-grid">${docs
                .map(
                  (d) => `<div class="doc-card">
            <div class="doc-thumb" data-action="view-doc" data-car="${carId}" data-id="${d.id}">${
                    d.thumb ? `<img src="${d.thumb}" alt="">` : icon("doc", 26)
                  }</div>
            <div class="doc-meta"><span>${esc(d.label || this._docLabel(d.kind))}</span>
              <button class="icon-btn" data-action="del-doc" data-car="${carId}" data-id="${d.id}">${icon("trash", 15)}</button></div>
          </div>`
                )
                .join("")}</div>`
            : `<div class="muted small" style="margin-top:8px">Niciun document atașat.</div>`
        }
      </section>

      <section class="card">
        <div class="row-between"><h3 style="margin-top:0">${icon("fuel", 18)} Combustibil</h3>
          ${cons ? `<span class="pill">${cons} L/100km</span>` : ""}</div>
        <div class="form-grid">
          <label>Data<input type="date" id="df-date" value="${this._today()}"></label>
          <label>Litri<input type="number" id="df-liters" step="0.01"></label>
          <label>Sumă (RON)<input type="number" id="df-price" step="0.01"></label>
          <label>Km bord<input type="number" id="df-odo"></label>
          <label class="check"><input type="checkbox" id="df-full" checked> Plin</label>
        </div>
        <div class="form-actions">
          <button class="btn" data-action="scan-fuel">${icon("camera", 16)} Scanează bon</button>
          <button class="btn primary" data-action="add-fuel-detail" data-id="${carId}">${icon("plus", 16)} Adaugă alimentare</button>
        </div>
        ${
          fuel.length
            ? `<table class="tbl"><thead><tr><th>Data</th><th>Litri</th><th>Sumă</th><th>Km</th><th></th></tr></thead><tbody>${fuel
                .map(
                  (f) =>
                    `<tr><td>${esc(f.date || "")}</td><td>${f.liters ?? "—"}</td><td>${fmtRon(
                      f.price_total
                    )}</td><td>${f.odometer ? f.odometer.toLocaleString("ro-RO") : "—"}</td><td><button class="icon-btn" data-action="del-fuel" data-id="${f.id}">${icon("trash", 15)}</button></td></tr>`
                )
                .join("")}</tbody></table>`
            : `<div class="muted small" style="margin-top:10px">Nicio alimentare încă.</div>`
        }
      </section>

      <section class="card">
        <h3 style="margin-top:0">${icon("kit", 18)} Intervenții / reparații</h3>
        <div class="form-grid">
          <label>Nume<input id="di-name" placeholder="ex. Planetară stânga"></label>
          <label>Descriere<input id="di-desc"></label>
          <label>Cost (RON)<input type="number" id="di-amount" step="0.01"></label>
          <label>Data<input type="date" id="di-date" value="${this._today()}"></label>
          <label>La km<input type="number" id="di-km"></label>
        </div>
        <div class="form-actions"><button class="btn primary" data-action="add-int-detail" data-id="${carId}">${icon("plus", 16)} Adaugă intervenție</button></div>
        ${
          interventions.length
            ? `<table class="tbl"><thead><tr><th>Data</th><th>Nume</th><th>Cost</th><th>Km</th><th></th></tr></thead><tbody>${interventions
                .map(
                  (i) =>
                    `<tr><td>${esc(i.date || "")}</td><td>${esc(i.name || i.description || "—")}</td><td>${fmtRon(
                      i.amount
                    )}</td><td>${i.km ? i.km.toLocaleString("ro-RO") : "—"}</td><td><button class="icon-btn" data-action="del-int-saved" data-car="${carId}" data-id="${i.id}">${icon("trash", 15)}</button></td></tr>`
                )
                .join("")}</tbody></table>`
            : `<div class="muted small" style="margin-top:10px">Nicio intervenție încă.</div>`
        }
      </section>

      <section class="card">
        <div class="row-between">
          <h3 style="margin-top:0">${icon("wallet", 18)} Istoric & cheltuieli</h3>
          <div class="detail-pills">
            ${costPerKm ? `<span class="pill">~${costPerKm.toFixed(2)} lei/km</span>` : ""}
            <span class="pill">${fmtRon(carTotal)}</span>
          </div>
        </div>
        ${entries.length ? this._timelineHtml(entries) : `<div class="muted small" style="margin-top:10px">Nimic încă. Adaugă o alimentare sau o intervenție mai sus.</div>`}
      </section>`;
  }

  _timelineHtml(entries) {
    const meta = {
      fuel: { ic: "fuel", label: "Alimentare" },
      int: { ic: "kit", label: "Intervenție" },
      cost: { ic: "wallet", label: "Cheltuială" },
    };
    return `<div class="timeline">${entries
      .map((e) => {
        const m = meta[e.src] || meta.cost;
        return `<div class="tl-item">
          <div class="tl-ic ${e.src}">${icon(m.ic, 16)}</div>
          <div class="tl-body">
            <div class="tl-top"><span class="tl-title">${esc(e.note || this._catLabel(e.cat))}</span><span class="tl-amt">${fmtRon(e.amount)}</span></div>
            <div class="tl-sub muted small">${esc(this._catLabel(e.cat))} · ${esc(e.date || "fără dată")}</div>
          </div>
        </div>`;
      })
      .join("")}</div>`;
  }

  _catLabel(cat) {
    const extra = { interventie: "Intervenție", service: "Service" };
    return extra[cat] || Object.fromEntries(COST_CATEGORIES)[cat] || cat;
  }

  _docLabel(kind) {
    return Object.fromEntries(DOC_KINDS)[kind] || kind;
  }

  async _addDoc(carId) {
    const kindSel = this.shadowRoot.getElementById("doc-kind");
    const kind = kindSel ? kindSel.value : "altele";
    const file = await this._pickImage();
    if (!file) return;
    this._toast("Se încarcă documentul…");
    let full, thumb;
    try {
      full = await this._scaleImage(file, 1400, 0.78);
      thumb = await this._scaleImage(file, 280, 0.6);
    } catch (err) {
      this._toast("Imagine invalidă.");
      return;
    }
    this._mutate("upload_document", { car_id: carId, kind, label: this._docLabel(kind), thumb, image: full });
  }

  async _viewDoc(carId, docId) {
    const overlay = document.createElement("div");
    overlay.className = "doc-overlay";
    overlay.innerHTML = `<div class="doc-modal"><button class="doc-close" title="Închide">✕</button><div class="doc-img muted">Se încarcă…</div></div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest(".doc-close")) overlay.remove();
    });
    this.shadowRoot.appendChild(overlay);
    let res;
    try {
      res = await this._call("get_document", { car_id: carId, doc_id: docId });
    } catch (err) {
      res = null;
    }
    const wrap = overlay.querySelector(".doc-img");
    if (res && res.image) {
      wrap.innerHTML = `<img src="${res.image}" alt="">`;
      wrap.classList.remove("muted");
    } else {
      wrap.textContent = "Imaginea nu a putut fi încărcată.";
    }
  }

  async _genInsight() {
    const el = this.shadowRoot.getElementById("insight-text");
    if (el) {
      el.textContent = "Se generează rezumatul cu Gemini…";
      el.classList.add("muted");
    }
    let res;
    try {
      res = await this._call("insight", {});
    } catch (err) {
      if (el) el.textContent = `Eroare: ${err}`;
      return;
    }
    if (el) {
      if (res && res.ok) {
        el.textContent = res.text;
        el.classList.remove("muted");
      } else {
        el.textContent = (res && res.error) || "Nu s-a putut genera.";
      }
    }
  }

  _planner() {
    const today = new Date();
    void today;
    const items = [];
    this._data.view.cars.forEach((c) => {
      LEGAL_DEFS.forEach((d) => {
        const i = c.legal[d.key];
        if (i.configured && i.zile_ramase != null && i.zile_ramase <= 90)
          items.push({ car: c.name, label: d.label, days: i.zile_ramase, date: i.expira });
      });
      Object.values(c.service || {}).forEach((s) => {
        if (s.days_remaining != null && s.days_remaining <= 90 && s.days_remaining >= -730)
          items.push({ car: c.name, label: s.label, days: s.days_remaining, date: s.last_date });
      });
      Object.values(c.equipment || {}).forEach((e) => {
        if (e.zile_ramase != null && e.zile_ramase <= 90)
          items.push({ car: c.name, label: e.label, days: e.zile_ramase, date: e.expira });
      });
    });
    items.sort((a, b) => a.days - b.days);
    if (!items.length) return "";
    return `
      <section class="card">
        <div class="overline">URMĂTOARELE 90 DE ZILE</div>
        <h3 style="margin-top:4px">Ce urmează</h3>
        ${items
          .map(
            (it) => `<div class="alert-row ${it.days < 0 ? "critic" : ""}">
          <div><strong>${esc(it.label)}</strong><div class="muted small">${esc(it.car)}${
              it.date ? " · " + esc(it.date) : ""
            }</div></div>
          <span class="pill ${it.days < 0 ? "critic" : it.days <= 14 ? "atentie" : ""}">${
              it.days < 0 ? `expirat ${-it.days}z` : `în ${it.days} zile`
            }</span>
        </div>`
          )
          .join("")}
      </section>`;
  }

  _carCostEntries(carId) {
    const out = [];
    (this._data.raw.costs || [])
      .filter((c) => c.car_id === carId)
      .forEach((c) => out.push({ id: c.id, src: "cost", date: c.date, cat: c.category, amount: c.amount, note: c.note }));
    const raw = (this._data.raw.cars || {})[carId] || {};
    (raw.interventions || []).forEach((i) =>
      out.push({ id: i.id, src: "int", date: i.date, cat: "interventie", amount: i.amount, note: i.name || i.description })
    );
    (this._data.raw.fuel || [])
      .filter((f) => f.car_id === carId)
      .forEach((f) => out.push({ id: f.id, src: "fuel", date: f.date, cat: "combustibil", amount: f.price_total, note: f.liters ? f.liters + " L" : "" }));
    return out.filter((e) => e.amount != null).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  _addFuelDetail(carId) {
    const g = (id) => this.shadowRoot.getElementById(id);
    const entry = {
      car_id: carId,
      date: g("df-date").value,
      liters: Number(g("df-liters").value || 0),
      price_total: Number(g("df-price").value || 0),
      odometer: g("df-odo").value ? Number(g("df-odo").value) : null,
      full: g("df-full").checked,
    };
    if (!entry.liters && !entry.price_total) {
      this._toast("Introdu litri sau sumă.");
      return;
    }
    this._mutate("add_fuel", { entry });
  }

  _addIntDetail(carId) {
    const g = (id) => this.shadowRoot.getElementById(id);
    const item = {
      name: g("di-name").value.trim(),
      description: g("di-desc").value.trim(),
      amount: g("di-amount").value ? Number(g("di-amount").value) : null,
      date: g("di-date").value || null,
      km: g("di-km").value ? Number(g("di-km").value) : null,
    };
    if (!item.name && item.amount == null) {
      this._toast("Pune un nume sau o sumă.");
      return;
    }
    this._mutate("add_intervention", { car_id: carId, item });
  }

  _costDelBtn(e, carId) {
    if (e.src === "cost") return `<button class="icon-btn" data-action="del-cost" data-id="${e.id}">${icon("trash", 15)}</button>`;
    if (e.src === "fuel") return `<button class="icon-btn" data-action="del-fuel" data-id="${e.id}">${icon("trash", 15)}</button>`;
    if (e.src === "int") return `<button class="icon-btn" data-action="del-int-saved" data-car="${carId}" data-id="${e.id}">${icon("trash", 15)}</button>`;
    return "";
  }

  // ----------------------------------------------------------- COSTURI
  _costs() {
    const costs = this._data.view.costs;
    const carList = Object.values(this._data.raw.cars || {});

    return `
      <section class="card">
        <div class="overline">COSTURI</div>
        <h2>Cheltuieli</h2>
        <div class="kpis">
          ${this._kpi("Luna aceasta", fmtRon(costs.grand_month), "toate")}
          ${this._kpi("Anul curent", fmtRon(costs.grand_total_year), `${costs.year}`)}
          ${this._kpi("Combustibil an", fmtRon(costs.fuel_total_year), "")}
          ${this._kpi("Service & taxe an", fmtRon(costs.total_year), "")}
        </div>
      </section>

      <section class="card">
        <h3 style="margin-top:0">Adaugă cheltuială</h3>
        <p class="muted small">Combustibilul apare automat la mașină + consum. „Service / Intervenție" se salvează ca intervenție la mașină.</p>
        <div class="form-grid">
          <label>Mașină<select id="cost-car">${this._carOptions()}</select></label>
          <label>Categorie<select id="cost-cat">${COST_CATEGORIES.map(
            ([v, l]) => `<option value="${v}">${l}</option>`
          ).join("")}</select></label>
          <label>Sumă (RON)<input type="number" id="cost-amount" step="0.01"></label>
          <label>Data<input type="date" id="cost-date" value="${this._today()}"></label>
          <label>Notă / nume<input id="cost-note"></label>
          <label>Litri (combustibil)<input type="number" id="cost-liters" step="0.01"></label>
          <label>Km bord (combustibil)<input type="number" id="cost-odo"></label>
        </div>
        <div class="form-actions">
          <button class="btn" data-action="scan-cost">${icon("camera", 16)} Scanează bon</button>
          <button class="btn primary" data-action="add-cost">${icon("plus", 16)} Adaugă</button>
        </div>
      </section>

      ${
        carList.length
          ? carList
              .map((car) => {
                const entries = this._carCostEntries(car.id);
                if (!entries.length) return "";
                const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
                return `<section class="card">
          <div class="row-between"><h3 style="margin-top:0">${icon("car", 17)} ${esc(car.name)}</h3><span class="pill">${fmtRon(total)}</span></div>
          <table class="tbl"><thead><tr><th>Data</th><th>Categorie</th><th>Sumă</th><th>Notă</th><th></th></tr></thead><tbody>
          ${entries
            .map(
              (e) =>
                `<tr><td>${esc(e.date || "")}</td><td>${esc(this._catLabel(e.cat))}</td><td>${fmtRon(
                  e.amount
                )}</td><td>${esc(e.note || "")}</td><td>${this._costDelBtn(e, car.id)}</td></tr>`
            )
            .join("")}
          </tbody></table>
        </section>`;
              })
              .join("")
          : `<section class="card"><div class="muted">Nicio cheltuială încă. Adaugă mai sus.</div></section>`
      }`;
  }

  // ----------------------------------------------------------- STATISTICI
  _stats() {
    const costs = this._data.view.costs;
    const cats = costs.by_category;
    const max = Math.max(1, ...Object.values(cats), costs.fuel_total_year);
    const rows = [
      ...Object.entries(cats),
      ["combustibil (consum)", costs.fuel_total_year],
    ];

    const consumption = costs.consumption || {};
    const cars = this._data.raw.cars || {};

    return `
      <section class="card">
        <div class="row-between">
          <div><div class="overline">AI · GEMINI</div><h3 style="margin-top:4px">Insight lunar</h3></div>
          <button class="btn primary" data-action="gen-insight">${icon("sparkle", 16)} Generează</button>
        </div>
        <div id="insight-text" class="muted" style="margin-top:12px; line-height:1.55">Apasă „Generează" pentru un rezumat AI al cheltuielilor tale (folosește integrarea ta Google AI).</div>
      </section>

      <section class="card">
        <div class="overline">STATISTICI</div>
        <h2>Pe tip de cheltuială (${costs.year})</h2>
        ${rows
          .map(
            ([label, val]) => `
          <div class="bar-row">
            <div class="bar-label">${esc(label)}</div>
            <div class="bar"><div class="bar-fill" style="width:${(val / max) * 100}%"></div></div>
            <div class="bar-val">${fmtRon(val)}</div>
          </div>`
          )
          .join("")}
      </section>

      <section class="card">
        <h3>Consum mediu</h3>
        ${
          Object.keys(consumption).length
            ? Object.entries(consumption)
                .map(
                  ([cid, val]) =>
                    `<div class="alert-row"><strong>${esc(
                      (cars[cid] || {}).name || "—"
                    )}</strong><span class="pill">${val} L/100km</span></div>`
                )
                .join("")
            : `<div class="muted">Adaugă cel puțin 2 alimentări „plin” pentru a calcula consumul.</div>`
        }
      </section>`;
  }

  // ----------------------------------------------------------- COMBUSTIBIL
  _fuel() {
    const raw = this._data.raw.fuel || [];
    const cars = this._data.raw.cars || {};
    const list = [...raw].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return `
      <section class="card">
        <div class="overline">COMBUSTIBIL</div>
        <h2>Bonuri combustibil</h2>
        <div class="form-grid">
          <label>Mașină<select id="fuel-car">${this._carOptions()}</select></label>
          <label>Data<input type="date" id="fuel-date" value="${this._today()}"></label>
          <label>Litri<input type="number" id="fuel-liters" step="0.01"></label>
          <label>Sumă (RON)<input type="number" id="fuel-price" step="0.01"></label>
          <label>Km bord<input type="number" id="fuel-odo"></label>
          <label class="check"><input type="checkbox" id="fuel-full" checked> Plin</label>
        </div>
        <div class="form-actions">
          <button class="btn" data-action="scan-fuel">${icon("camera", 16)} Scanează bon</button>
          <button class="btn primary" data-action="add-fuel">Adaugă bon</button>
        </div>
      </section>

      <section class="card">
        <h3>Istoric alimentări</h3>
        ${
          list.length
            ? `<table class="tbl"><thead><tr><th>Data</th><th>Mașină</th><th>Litri</th><th>Sumă</th><th>Km</th><th>Plin</th><th></th></tr></thead><tbody>${list
                .map(
                  (f) => `<tr>
            <td>${esc(f.date || "")}</td>
            <td>${esc((cars[f.car_id] || {}).name || "—")}</td>
            <td>${f.liters ?? "—"}</td>
            <td>${fmtRon(f.price_total)}</td>
            <td>${f.odometer ? f.odometer.toLocaleString("ro-RO") : "—"}</td>
            <td>${f.full ? "✅" : "—"}</td>
            <td><button class="icon-btn" data-action="del-fuel" data-id="${f.id}">${icon("trash", 16)}</button></td>
          </tr>`
                )
                .join("")}</tbody></table>`
            : `<div class="muted">Niciun bon înregistrat.</div>`
        }
      </section>`;
  }

  // ----------------------------------------------------------- ANVELOPE
  _tires() {
    const cars = Object.values(this._data.raw.cars || {});
    if (!cars.length) return this._emptyState();
    return `<section class="card"><div class="overline">ANVELOPE</div><h2>Anvelope</h2>
      <p class="muted small">Sezon montat, profil rămas (mm) și data ultimei schimbări, per autovehicul.</p>
      ${cars
        .map((c) => {
          const t = c.tires || {};
          return `<div class="car">
          <div class="car-name">${icon("tire", 18)} ${esc(c.name)}</div>
          <div class="form-grid">
            <label>Sezon<select id="tire-${c.id}-season">
              ${TIRE_SEASONS.map(
                (s) =>
                  `<option value="${s}" ${t.season === s ? "selected" : ""}>${s || "—"}</option>`
              ).join("")}
            </select></label>
            <label>Profil față (mm)<input type="number" step="0.1" id="tire-${c.id}-front" value="${
            t.front_mm ?? ""
          }"></label>
            <label>Profil spate (mm)<input type="number" step="0.1" id="tire-${c.id}-rear" value="${
            t.rear_mm ?? ""
          }"></label>
            <label>Data schimbării<input type="date" id="tire-${c.id}-date" value="${esc(
            t.change_date || ""
          )}"></label>
            <label>Notă<input id="tire-${c.id}-note" value="${esc(t.note || "")}"></label>
          </div>
          <div class="form-actions">
            <button class="btn primary" data-action="save-tires" data-id="${c.id}">Salvează</button>
          </div>
        </div>`;
        })
        .join("")}
    </section>`;
  }

  // ----------------------------------------------------------- DOTĂRI
  _equipment() {
    const cars = Object.values(this._data.raw.cars || {});
    if (!cars.length) return this._emptyState();
    const tag = (label, has, extra) =>
      `<span class="tag ${has ? "ok" : "warn"}">${esc(label)} ${has ? "✓" : "✗"}${
        has && extra ? " · " + esc(extra) : ""
      }</span>`;
    return `<section class="card"><div class="overline">DOTĂRI</div><h2>Dotări obligatorii</h2>
      ${cars
        .map((c) => {
          const eq = c.equipment || {};
          const trusa = this._eqDate(eq.trusa_medicala);
          const sting = this._eqDate(eq.stingator);
          return `<div class="car">
          <div class="row-between"><div class="car-name">${icon("car", 18)} ${esc(c.name)}</div>
          <button class="btn" data-action="edit-car" data-id="${c.id}">Editează</button></div>
          <div class="tags">
            ${tag("Trusă medicală", trusa.has, trusa.expira ? "exp. " + trusa.expira : "")}
            ${tag("Stingător", sting.has, sting.expira ? "exp. " + sting.expira : "")}
            ${tag("Vestă", !!eq.vesta, "")}
            ${tag("Triunghi", !!eq.triunghi, "")}
          </div></div>`;
        })
        .join("")}
    </section>`;
  }

  // ----------------------------------------------------------- BATERIE
  _battery() {
    const cars = Object.values(this._data.raw.cars || {});
    if (!cars.length) return this._emptyState();
    return `<section class="card"><div class="overline">BATERIE</div><h2>Stare baterie</h2>
      ${cars
        .map((c) => {
          const b = c.battery || {};
          let info = "neconfigurat";
          if (b.install_date) {
            const months = b.warranty_months || 48;
            const end = new Date(b.install_date);
            end.setMonth(end.getMonth() + months);
            const days = Math.round((end - new Date()) / 86400000);
            info = `montată ${b.install_date}, garanție expiră în ~${days} zile`;
          }
          return `<div class="car"><div class="row-between"><div class="car-name">${icon("battery", 18)} ${esc(
            c.name
          )}</div><button class="btn" data-action="edit-car" data-id="${c.id}">Editează</button></div>
          <div class="muted small">${esc(info)}</div></div>`;
        })
        .join("")}
    </section>`;
  }

  // ----------------------------------------------------------- SETĂRI
  _settings() {
    const s = this._data.raw.settings || {};
    return `
      <section class="card">
        <div class="overline">SETĂRI</div>
        <h2>Configurare și administrare</h2>
        <div class="form-grid">
          <label class="check"><input type="checkbox" id="set-enabled" ${
            s.notify_enabled ? "checked" : ""
          }> Activează notificările</label>
          <label>Praguri notificare (zile, separate prin virgulă)
            <input id="set-days" value="${esc((s.notify_days || [30, 7, 1]).join(", "))}"></label>
          <label>Serviciu notificare<input id="set-service" value="${esc(
            s.notify_service || ""
          )}" placeholder="notify.mobile_app_telefon"></label>
          <label>Model Gemini (scanare poze)<input id="set-gemini" value="${esc(
            s.gemini_model || ""
          )}" placeholder="auto (din integrarea Google AI)"></label>
        </div>
        <p class="muted small">Scanarea pozelor (bonuri, talon) folosește integrarea ta
        <b>Google Generative AI (Gemini)</b> din HA — nu e nevoie de altă cheie. Lasă
        modelul gol pentru a-l prelua automat, sau scrie unul (ex. <code>gemini-2.0-flash</code>).</p>
        <div class="form-actions"><button class="btn primary" data-action="save-settings">Salvează setări</button></div>
      </section>

      <section class="card">
        <h3>Backup / Restore</h3>
        <p class="muted">Exportă toate datele (mașini, costuri, combustibil) într-un fișier JSON, sau importă-le (merge).</p>
        <div class="form-actions">
          <button class="btn" data-action="export">Exportă backup</button>
          <label class="btn file">Importă merge<input type="file" id="import-file" accept="application/json" hidden></label>
        </div>
      </section>`;
  }

  // ----------------------------------------------------------- helpers
  _kpi(label, value, sub) {
    return `<div class="kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-val">${esc(
      value
    )}</div><div class="kpi-sub">${esc(sub || "")}</div></div>`;
  }

  _emptyState() {
    return `<div class="empty">
      <div class="empty-icon">${icon("car", 46)}</div>
      <h3>Nicio mașină încă</h3>
      <p class="muted">Adaugă primul autovehicul ca să urmărești termene, revizii și costuri.</p>
      <button class="btn primary" data-action="add-car">${icon("plus", 16)} Adaugă autovehicul</button>
    </div>`;
  }

  _carOptions() {
    const cars = Object.values(this._data.raw.cars || {});
    return cars.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  }

  _chipClass(info) {
    if (!info.configured) return "muted";
    if (info.expired) return "red";
    if (info.alert) return "orange";
    return "green";
  }

  _chipText(info) {
    if (!info.configured) return "neconfigurat";
    if (info.zile_ramase === null) return "—";
    if (info.zile_ramase < 0) return `expirat ${-info.zile_ramase}z`;
    return `${info.zile_ramase} zile`;
  }

  _alertWhen(a) {
    if (a.type === "service" && a.km != null && (a.days == null || a.km < a.days)) {
      return a.km < 0 ? `depășit ${-a.km} km` : `în ${a.km} km`;
    }
    if (a.days == null) return "verifică";
    return a.days < 0 ? `depășit ${-a.days} zile` : `în ${a.days} zile`;
  }

  _today() {
    return new Date().toISOString().slice(0, 10);
  }

  // ----------------------------------------------------------- events
  _attach() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-tab]").forEach((el) =>
      el.addEventListener("click", () => {
        this._tab = el.dataset.tab;
        this._editing = null;
        this._detailCar = null;
        this._render();
      })
    );

    root.querySelectorAll("[data-action]").forEach((el) =>
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._onAction(el.dataset.action, el, ev);
      })
    );

    root.querySelectorAll(".cm-toggle").forEach((cb) =>
      cb.addEventListener("change", () => {
        const body = root.getElementById(cb.dataset.target);
        if (body) body.style.display = cb.checked ? "" : "none";
        const row = cb.closest(".disc-row");
        if (row) row.classList.toggle("on", cb.checked);
      })
    );

    const importFile = root.getElementById("import-file");
    if (importFile)
      importFile.addEventListener("change", (ev) => this._onImport(ev.target.files[0]));

    const makeSel = root.getElementById("f-make-select");
    if (makeSel) {
      const modelSel = root.getElementById("f-model-select");
      const makeWrap = root.getElementById("f-make-custom-wrap");
      const modelWrap = root.getElementById("f-model-custom-wrap");
      makeSel.addEventListener("change", () => {
        const mk = makeSel.value;
        makeWrap.style.display = mk === "__other__" ? "" : "none";
        const models = CAR_MAKES[mk] || [];
        modelSel.innerHTML =
          `<option value="">— alege —</option>` +
          models.map((m) => `<option>${esc(m)}</option>`).join("") +
          `<option value="__other__">Alt model…</option>`;
        modelWrap.style.display = mk === "__other__" ? "" : "none";
      });
      modelSel.addEventListener("change", () => {
        modelWrap.style.display = modelSel.value === "__other__" ? "" : "none";
      });
    }
  }

  _onAction(action, el) {
    switch (action) {
      case "add-car":
        this._tab = "masini";
        this._detailCar = null;
        this._editing = {};
        this._render();
        break;
      case "edit-car": {
        const raw = (this._data.raw.cars || {})[el.dataset.id];
        this._tab = "masini";
        this._detailCar = null;
        this._editing = JSON.parse(JSON.stringify(raw || {}));
        this._render();
        break;
      }
      case "open-car":
        this._tab = "masini";
        this._editing = null;
        this._detailCar = el.dataset.id;
        this._render();
        break;
      case "back-detail":
        this._detailCar = null;
        this._render();
        break;
      case "del-car":
        if (confirm("Ștergi acest autovehicul și toate datele asociate?")) {
          this._detailCar = null;
          this._mutate("delete_car", { car_id: el.dataset.id });
        }
        break;
      case "cancel-car":
        this._editing = null;
        this._render();
        break;
      case "add-intervention":
        this._editing = this._collectForm();
        (this._editing.interventions = this._editing.interventions || []).push({});
        this._render();
        break;
      case "del-intervention":
        this._editing = this._collectForm();
        (this._editing.interventions || []).splice(Number(el.dataset.idx), 1);
        this._render();
        break;
      case "save-car":
        this._saveCar();
        break;
      case "decode-vin":
        this._decodeVin();
        break;
      case "scan-fuel":
        this._scan("fuel");
        break;
      case "scan-cost":
        this._scan("cost");
        break;
      case "scan-talon":
        this._scan("talon");
        break;
      case "verify-rca":
        this._verifyRca();
        break;
      case "add-fuel-detail":
        this._addFuelDetail(el.dataset.id);
        break;
      case "add-int-detail":
        this._addIntDetail(el.dataset.id);
        break;
      case "del-int-saved":
        this._mutate("delete_intervention", { car_id: el.dataset.car, item_id: el.dataset.id });
        break;
      case "add-doc":
        this._addDoc(el.dataset.id);
        break;
      case "view-doc":
        this._viewDoc(el.dataset.car, el.dataset.id);
        break;
      case "del-doc":
        if (confirm("Ștergi acest document?"))
          this._mutate("delete_document", { car_id: el.dataset.car, doc_id: el.dataset.id });
        break;
      case "gen-insight":
        this._genInsight();
        break;
      case "add-cost":
        this._addCost();
        break;
      case "del-cost":
        this._mutate("delete_cost", { entry_id: el.dataset.id });
        break;
      case "add-fuel":
        this._addFuel();
        break;
      case "del-fuel":
        this._mutate("delete_fuel", { entry_id: el.dataset.id });
        break;
      case "save-tires":
        this._saveTires(el.dataset.id);
        break;
      case "save-settings":
        this._saveSettings();
        break;
      case "export":
        this._export();
        break;
    }
  }

  _collectForm() {
    const car = JSON.parse(JSON.stringify(this._editing || {}));
    this.shadowRoot.querySelectorAll("[data-f]").forEach((el) => {
      const path = el.dataset.f.split(".");
      let val;
      if (el.type === "checkbox") val = el.checked;
      else if (el.type === "number") val = el.value === "" ? null : Number(el.value);
      else val = el.value || null;
      let obj = car;
      for (let i = 0; i < path.length - 1; i++) {
        obj[path[i]] = obj[path[i]] || {};
        obj = obj[path[i]];
      }
      obj[path[path.length - 1]] = val;
    });
    const makeSel = this.shadowRoot.getElementById("f-make-select");
    if (makeSel) {
      car.make =
        makeSel.value === "__other__"
          ? this.shadowRoot.getElementById("f-make-custom").value || ""
          : makeSel.value;
      const modelSel = this.shadowRoot.getElementById("f-model-select");
      car.model =
        modelSel.value === "__other__"
          ? this.shadowRoot.getElementById("f-model-custom").value || ""
          : modelSel.value;
    }
    // progressive-disclosure sections (bifă → câmpuri)
    car.legal = this._collectLegal();
    car.service = this._collectService();
    car.equipment = this._collectEquipment();
    car.battery = this._collectBattery();
    car.interventions = this._collectInterventions();
    return car;
  }

  _saveCar() {
    const car = this._collectForm();
    if (!car.name) {
      this._toast("Numele este obligatoriu.");
      return;
    }
    if (car.id) {
      const id = car.id;
      delete car.id;
      this._editing = null;
      this._mutate("update_car", { car_id: id, car });
    } else {
      this._editing = null;
      this._mutate("add_car", { car });
    }
  }

  _addCost() {
    const g = (id) => this.shadowRoot.getElementById(id);
    const carId = g("cost-car").value;
    const cat = g("cost-cat").value;
    const amount = Number(g("cost-amount").value || 0);
    const date = g("cost-date").value;
    const note = g("cost-note").value;
    if (!carId || !amount) {
      this._toast("Alege mașina și introdu suma.");
      return;
    }
    // Rutează către sursa corectă, ca datele să fie unificate peste tot.
    if (cat === "combustibil") {
      this._mutate("add_fuel", {
        entry: {
          car_id: carId,
          date,
          liters: g("cost-liters").value ? Number(g("cost-liters").value) : 0,
          price_total: amount,
          odometer: g("cost-odo").value ? Number(g("cost-odo").value) : null,
          full: true,
        },
      });
    } else if (cat === "service" || cat === "interventie") {
      this._mutate("add_intervention", {
        car_id: carId,
        item: { name: note || "Intervenție", description: note, amount, date },
      });
    } else {
      this._mutate("add_cost", { entry: { car_id: carId, date, category: cat, amount, note } });
    }
  }

  _addFuel() {
    const g = (id) => this.shadowRoot.getElementById(id);
    const entry = {
      car_id: g("fuel-car").value,
      date: g("fuel-date").value,
      liters: Number(g("fuel-liters").value || 0),
      price_total: Number(g("fuel-price").value || 0),
      odometer: g("fuel-odo").value ? Number(g("fuel-odo").value) : null,
      full: g("fuel-full").checked,
    };
    if (!entry.car_id || !entry.liters) {
      this._toast("Alege mașina și introdu litrii.");
      return;
    }
    this._mutate("add_fuel", { entry });
  }

  _saveTires(carId) {
    const g = (suffix) => this.shadowRoot.getElementById(`tire-${carId}-${suffix}`);
    const tires = {
      season: g("season").value,
      front_mm: g("front").value === "" ? null : Number(g("front").value),
      rear_mm: g("rear").value === "" ? null : Number(g("rear").value),
      change_date: g("date").value || null,
      note: g("note").value,
    };
    this._mutate("update_car", { car_id: carId, car: { tires } });
  }

  _saveSettings() {
    const g = (id) => this.shadowRoot.getElementById(id);
    const days = g("set-days")
      .value.split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x));
    this._mutate("update_settings", {
      settings: {
        notify_enabled: g("set-enabled").checked,
        notify_days: days.length ? days : [30, 7, 1],
        notify_service: g("set-service").value,
        gemini_model: g("set-gemini").value,
      },
    });
  }

  _verifyRca() {
    const plateEl = this.shadowRoot.querySelector('[data-f="plate"]');
    const vinEl = this.shadowRoot.getElementById("f-vin");
    const plate = plateEl ? plateEl.value.trim() : "";
    const vin = vinEl ? vinEl.value.trim() : "";
    const q = plate || vin;
    if (q && navigator.clipboard) navigator.clipboard.writeText(q).catch(() => {});
    window.open("https://www.aida.info.ro/polite-rca", "_blank", "noopener");
    this._toast(
      q
        ? `Am deschis aida.info.ro și am copiat „${q}" în clipboard. Bifează „nu sunt robot", apoi treci datele aici.`
        : "Am deschis aida.info.ro. Introdu numărul sau VIN-ul acolo."
    );
  }

  // ----------------------------------------------------------- scanare poză
  _pickImage() {
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.capture = "environment";
      inp.style.display = "none";
      inp.addEventListener("change", () =>
        resolve(inp.files && inp.files[0] ? inp.files[0] : null)
      );
      inp.click();
    });
  }

  _scaleImage(file, max = 1280, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > max) {
          const r = max / Math.max(w, h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  async _scan(kind) {
    const file = await this._pickImage();
    if (!file) return;
    this._toast("Se scanează poza cu Gemini…");
    let image;
    try {
      image = await this._scaleImage(file);
    } catch (err) {
      this._toast(`Nu am putut citi imaginea: ${err}`);
      return;
    }
    const model = (this._data.raw.settings || {}).gemini_model || "";
    let res;
    try {
      res = await this._call("scan", { kind, image, model });
    } catch (err) {
      this._toast(`Eroare scanare: ${err}`);
      return;
    }
    if (!res || !res.ok) {
      this._toast(res && res.error ? res.error : "Scanarea a eșuat.");
      return;
    }
    const d = res.data || {};
    if (kind === "fuel") this._applyFuel(d);
    else if (kind === "cost") this._applyCost(d);
    else if (kind === "talon") this._applyTalon(d);
  }

  _setField(id, value) {
    const el = this.shadowRoot.getElementById(id);
    if (el && value !== null && value !== undefined && value !== "") el.value = value;
  }

  _applyFuel(d) {
    // detaliu mașină (df-*) sau, ca fallback, vechiul tab (fuel-*)
    this._setField("df-date", d.date);
    this._setField("df-liters", d.liters);
    this._setField("df-price", d.price_total);
    this._setField("df-odo", d.odometer);
    this._setField("fuel-date", d.date);
    this._setField("fuel-liters", d.liters);
    this._setField("fuel-price", d.price_total);
    this._setField("fuel-odo", d.odometer);
    this._toast("Date completate din bon. Verifică și apasă Adaugă.");
  }

  _applyCost(d) {
    this._setField("cost-date", d.date);
    this._setField("cost-amount", d.amount);
    this._setField("cost-note", d.note);
    if (d.category) {
      const sel = this.shadowRoot.getElementById("cost-cat");
      const opt = [...sel.options].find((o) => o.value === String(d.category).toLowerCase());
      if (opt) sel.value = opt.value;
    }
    this._toast("Date completate din document. Verifică și apasă Adaugă.");
  }

  _applyTalon(d) {
    this._setMakeModel(d.make, d.model);
    this._setField("f-year", d.year);
    this._setField("f-vin", d.vin ? String(d.vin).toUpperCase() : "");
    const plate = this.shadowRoot.querySelector('[data-f="plate"]');
    if (plate && d.plate) plate.value = d.plate;
    this._toast("Date completate din talon. Verifică și apasă Salvează.");
  }

  _titleCase(s) {
    return String(s).replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
  }

  _setMakeModel(make, model) {
    if (make) {
      const ms = this.shadowRoot.getElementById("f-make-select");
      if (ms) {
        const key = Object.keys(CAR_MAKES).find(
          (k) => k.toLowerCase() === String(make).toLowerCase()
        );
        ms.value = key || "__other__";
        ms.dispatchEvent(new Event("change"));
        if (ms.value === "__other__")
          this.shadowRoot.getElementById("f-make-custom").value = key || this._titleCase(make);
      }
    }
    if (model) {
      const md = this.shadowRoot.getElementById("f-model-select");
      if (md) {
        const opt = [...md.options].find(
          (o) => o.value.toLowerCase() === String(model).toLowerCase()
        );
        md.value = opt ? opt.value : "__other__";
        md.dispatchEvent(new Event("change"));
        if (md.value === "__other__")
          this.shadowRoot.getElementById("f-model-custom").value = model;
      }
    }
  }

  _export() {
    const data = this._data.raw;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `car_manager_backup_${this._today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async _onImport(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await this._mutate("import_merge", { data });
      this._toast("Import reușit.");
    } catch (err) {
      this._toast(`Import eșuat: ${err}`);
    }
  }

  // ----------------------------------------------------------- styles
  _styles() {
    return `<style>
      :host {
        --bg:#f5f5f7; --surface:#ffffff; --surface-2:#f4f4f6; --surface-3:#ececef;
        --hairline:rgba(0,0,0,.07);
        --text:#1d1d1f; --text-2:#3a3a3c; --muted:#86868b;
        --accent:#34c759; --accent-deep:#1f9e46; --accent-soft:rgba(52,199,89,.13);
        --ok:#34c759; --warn:#ff9f0a; --danger:#ff3b30;
        --warn-soft:rgba(255,159,10,.14); --danger-soft:rgba(255,59,48,.12);
        --sh-1:0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05);
        --sh-2:0 2px 6px rgba(0,0,0,.05), 0 18px 40px rgba(0,0,0,.09);
        --r:24px; --r-md:18px; --r-sm:13px;
        display:block; min-height:100%; color:var(--text); background:var(--bg);
        font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",system-ui,Roboto,sans-serif;
        -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
      }
      * { box-sizing:border-box; }
      .ic { display:inline-block; vertical-align:middle; flex-shrink:0; }
      .wrap { max-width:1040px; margin:0 auto; padding:30px 22px 44px; display:flex; flex-direction:column; gap:24px; }
      .body { display:flex; flex-direction:column; gap:24px; }
      .loading { padding:80px; text-align:center; color:var(--muted); font-size:15px; }
      h1,h2,h3 { margin:0; letter-spacing:-.022em; }
      h2 { font-size:25px; font-weight:700; }
      h3 { font-size:15px; margin-top:26px; margin-bottom:4px; font-weight:650; letter-spacing:-.01em; }
      .muted { color:var(--muted); } .small { font-size:13px; }
      .overline { font-size:12px; letter-spacing:.01em; color:var(--muted); font-weight:600; margin-bottom:3px; }
      .row-between { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; }

      /* ---- HERO ---- */
      .hero { background:linear-gradient(180deg,#ffffff,#fcfdfc); border-radius:30px; padding:30px 32px;
        box-shadow:var(--sh-1); animation:rise .4s ease both; }
      .hero-row { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; }
      .hero-id { display:flex; gap:16px; align-items:center; }
      .logo { color:#fff; width:54px; height:54px; border-radius:16px; display:flex; align-items:center;
        justify-content:center; flex-shrink:0; background:linear-gradient(160deg,var(--accent),var(--accent-deep));
        box-shadow:0 8px 20px rgba(52,199,89,.32); }
      .brand { font-size:13px; font-weight:600; color:var(--muted); letter-spacing:.01em; }
      .hero h1 { font-size:30px; font-weight:760; margin-top:1px; }
      .status-pill { display:inline-flex; align-items:center; gap:9px; padding:9px 16px; border-radius:999px;
        font-size:13.5px; font-weight:600; background:var(--accent-soft); color:var(--accent-deep); }
      .status-pill.warn { background:var(--warn-soft); color:#b76e00; }
      .status-dot { width:8px; height:8px; border-radius:50%; background:currentColor; }
      .status-pill.warn .status-dot { animation:pulse 1.6s ease-in-out infinite; }
      @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:.35; } }
      .hero-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; margin-top:26px; }
      .hstat { display:flex; align-items:center; gap:13px; padding:15px 16px; border-radius:18px; background:var(--surface-2); }
      .hstat-ic { width:40px; height:40px; border-radius:12px; background:#fff; color:var(--muted);
        display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,.06); }
      .hstat.warn .hstat-ic { color:var(--warn); } .hstat.danger .hstat-ic { color:var(--danger); }
      .hstat-val { font-size:20px; font-weight:720; letter-spacing:-.02em; }
      .hstat-label { font-size:12.5px; color:var(--muted); margin-top:1px; }

      /* ---- BOTTOM NAV ---- */
      .tabs { position:sticky; bottom:16px; align-self:center; display:inline-flex; gap:2px; overflow-x:auto;
        padding:6px; margin-top:4px; border-radius:24px; z-index:5; max-width:100%;
        background:rgba(255,255,255,.72); backdrop-filter:blur(24px) saturate(180%);
        -webkit-backdrop-filter:blur(24px) saturate(180%); box-shadow:0 10px 34px rgba(0,0,0,.14);
        border:1px solid rgba(0,0,0,.05); }
      .tabs::-webkit-scrollbar { height:0; }
      .tab { border:none; background:transparent; color:var(--muted); padding:8px 13px; border-radius:18px;
        font-size:10.5px; font-weight:600; cursor:pointer; display:flex; flex-direction:column; align-items:center;
        gap:4px; white-space:nowrap; min-width:58px; transition:color .15s, background .2s, transform .12s; }
      .tab:hover { color:var(--text); }
      .tab.active { background:var(--accent); color:#fff; box-shadow:0 6px 16px rgba(52,199,89,.36); }

      /* ---- CARDS ---- */
      .card { background:var(--surface); border-radius:var(--r); padding:28px; box-shadow:var(--sh-1);
        animation:rise .4s ease both; }
      @keyframes rise { from { opacity:0; transform:translateY(10px); } }

      .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; margin-top:18px; }
      .kpi { background:var(--surface-2); border-radius:var(--r-md); padding:18px 19px; transition:transform .18s, box-shadow .18s; }
      .kpi:hover { transform:translateY(-3px); box-shadow:var(--sh-1); }
      .kpi-label { font-size:13px; color:var(--muted); font-weight:500; }
      .kpi-val { font-size:25px; font-weight:730; margin:6px 0 2px; letter-spacing:-.02em; }
      .kpi-sub { font-size:12.5px; color:var(--muted); }

      .car-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; margin-top:18px; }
      .car { border-radius:22px; padding:21px; background:var(--surface-2); transition:transform .18s, box-shadow .2s; }
      .car:hover { transform:translateY(-4px); box-shadow:var(--sh-2); }
      .car-name { font-weight:700; font-size:16.5px; display:flex; align-items:center; gap:9px; letter-spacing:-.01em; }
      .car-name .ic { color:var(--accent); }
      .car-actions { display:flex; gap:4px; }
      .chips { display:grid; grid-template-columns:repeat(auto-fit,minmax(70px,1fr)); gap:8px; margin-top:15px; }
      .chip { border-radius:15px; padding:11px 8px; text-align:center; background:var(--surface); box-shadow:0 1px 2px rgba(0,0,0,.04); }
      .chip-label { font-size:10px; color:var(--muted); letter-spacing:.02em; font-weight:600; }
      .chip-val { font-size:13px; font-weight:700; margin-top:3px; letter-spacing:-.01em; }
      .chip.green { background:var(--accent-soft); } .chip.green .chip-val { color:var(--accent-deep); }
      .chip.orange { background:var(--warn-soft); } .chip.orange .chip-val { color:#b76e00; }
      .chip.red { background:var(--danger-soft); } .chip.red .chip-val { color:var(--danger); }
      .chip.muted .chip-val { color:var(--muted); }

      .tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
      .tag { font-size:12.5px; background:var(--surface); border-radius:999px; padding:6px 13px; color:var(--text-2);
        box-shadow:0 1px 2px rgba(0,0,0,.04); }
      .tag.warn { background:var(--warn-soft); color:#b76e00; box-shadow:none; }
      .tag.ok { background:var(--accent-soft); color:var(--accent-deep); box-shadow:none; }

      .alert-row { display:flex; justify-content:space-between; align-items:center; gap:12px;
        padding:15px 17px; border-radius:16px; margin-top:10px; background:var(--surface-2); }
      .alert-row.critic { background:var(--danger-soft); }
      .pill { font-size:12px; font-weight:650; border-radius:999px; padding:5px 14px; background:var(--accent-soft); color:var(--accent-deep); }
      .pill.critic { background:rgba(255,59,48,.18); color:var(--danger); }
      .pill.atentie { background:var(--warn-soft); color:#b76e00; }

      .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:15px; margin-top:14px; }
      label { display:flex; flex-direction:column; font-size:13px; color:var(--text-2); gap:6px; font-weight:500; }
      label.inline { flex-direction:row; align-items:center; gap:8px; }
      label.check { flex-direction:row; align-items:center; gap:9px; }
      input, select { padding:11px 13px; border:1.5px solid transparent; border-radius:12px; font-size:14.5px;
        font-family:inherit; background:var(--surface-2); color:var(--text); transition:border-color .15s, box-shadow .15s, background .15s; }
      input::placeholder { color:var(--muted); }
      input:focus, select:focus { outline:none; background:#fff; border-color:var(--accent);
        box-shadow:0 0 0 4px var(--accent-soft); }
      select option { background:#fff; color:var(--text); }
      .vin-row { display:flex; gap:8px; } .vin-row input { flex:1; min-width:0; }

      .hint { font-size:12.5px; font-weight:500; color:var(--muted); margin-left:9px; }
      .disc-list { display:flex; flex-direction:column; gap:10px; margin-top:14px; }
      .disc-row { border-radius:16px; padding:14px 17px; background:var(--surface-2); transition:background .2s, box-shadow .2s; }
      .disc-row.on { background:var(--accent-soft); box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 40%, transparent); }
      .switch { display:flex; flex-direction:row; align-items:center; gap:13px; cursor:pointer; user-select:none; }
      .switch input { position:absolute; opacity:0; width:0; height:0; }
      .switch-track { width:46px; height:27px; border-radius:999px; background:#d6d6db; position:relative;
        transition:background .25s; flex-shrink:0; }
      .switch-thumb { position:absolute; top:2.5px; left:2.5px; width:22px; height:22px; border-radius:50%; background:#fff;
        transition:transform .25s; box-shadow:0 1px 3px rgba(0,0,0,.3); }
      .switch input:checked + .switch-track { background:var(--accent); }
      .switch input:checked + .switch-track .switch-thumb { transform:translateX(19px); }
      .switch-label { font-weight:600; font-size:14.5px; color:var(--text); }
      .disc-body { display:flex; flex-wrap:wrap; gap:15px; margin-top:14px; padding-left:59px; }

      .int-list { display:flex; flex-direction:column; gap:12px; margin-top:14px; }
      .int-row { border-radius:18px; padding:16px 17px; background:var(--surface-2); }
      .int-head { display:flex; gap:10px; align-items:center; }
      .int-head input { flex:1; font-weight:650; background:#fff; }
      .int-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:13px; margin-top:13px; }

      .form-actions { display:flex; gap:11px; justify-content:flex-end; margin-top:20px; flex-wrap:wrap; }
      .btn { display:inline-flex; align-items:center; gap:8px; border:none; background:var(--surface-3);
        padding:11px 18px; border-radius:13px; cursor:pointer; font-size:14.5px; font-weight:600; color:var(--text);
        transition:transform .12s, background .15s, box-shadow .2s; font-family:inherit; }
      .btn:hover { transform:translateY(-1px); background:#e2e2e6; }
      .btn.primary { background:linear-gradient(160deg,var(--accent),var(--accent-deep)); color:#fff;
        box-shadow:0 8px 20px rgba(52,199,89,.34); }
      .btn.primary:hover { box-shadow:0 11px 26px rgba(52,199,89,.46); background:linear-gradient(160deg,var(--accent),var(--accent-deep)); }
      .btn.file { display:inline-flex; align-items:center; }
      .icon-btn { display:inline-flex; align-items:center; border:none; background:transparent; cursor:pointer;
        padding:7px; border-radius:10px; color:var(--muted); transition:background .15s, color .15s; }
      .icon-btn:hover { background:var(--surface-3); color:var(--danger); }

      .tbl { width:100%; border-collapse:collapse; margin-top:12px; font-size:13.5px; }
      .tbl th { text-align:left; color:var(--muted); font-weight:600; padding:10px 9px; border-bottom:1px solid var(--hairline); }
      .tbl td { padding:11px 9px; border-bottom:1px solid var(--hairline); color:var(--text-2); }

      .bar-row { display:flex; align-items:center; gap:13px; margin:11px 0; }
      .bar-label { width:170px; font-size:13.5px; } .bar-val { width:110px; text-align:right; font-weight:700; font-size:13.5px; }
      .bar { flex:1; background:var(--surface-3); border-radius:999px; height:9px; overflow:hidden; }
      .bar-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent-deep)); border-radius:999px; }

      .car { cursor:pointer; }
      .car-cta { margin-top:13px; display:flex; align-items:center; gap:4px; color:var(--accent-deep); font-weight:600; font-size:13px; }
      .car-cta .ic { transition:transform .15s; }
      .car:hover .car-cta .ic { transform:translateX(3px); }
      .alert-badge { display:inline-flex; align-items:center; gap:3px; font-size:11px; font-weight:700;
        padding:3px 9px; border-radius:999px; }
      .alert-badge.ok { background:var(--accent-soft); color:var(--accent-deep); }
      .alert-badge.atentie { background:var(--warn-soft); color:#b76e00; }
      .alert-badge.critic { background:rgba(255,59,48,.16); color:var(--danger); }
      .detail-top { display:flex; justify-content:space-between; gap:10px; margin-bottom:20px; }
      .detail-head { display:flex; align-items:center; gap:16px; margin-bottom:6px; }
      .detail-logo { width:52px; height:52px; }
      .lines { display:flex; flex-direction:column; margin-top:8px; }
      .line-row { display:flex; justify-content:space-between; gap:12px; padding:10px 2px;
        border-bottom:1px solid var(--hairline); font-size:14px; }
      .line-row:last-child { border-bottom:none; }
      .t-warn { color:var(--warn); font-weight:600; } .t-danger { color:var(--danger); font-weight:600; }
      .detail-pills { display:flex; gap:8px; flex-wrap:wrap; }
      .timeline { display:flex; flex-direction:column; margin-top:6px; }
      .tl-item { display:flex; gap:13px; padding:14px 0; border-bottom:1px solid var(--hairline); }
      .tl-item:last-child { border-bottom:none; }
      .tl-ic { width:38px; height:38px; border-radius:11px; background:var(--surface-2); display:flex;
        align-items:center; justify-content:center; color:var(--muted); flex-shrink:0; }
      .tl-ic.fuel { background:var(--accent-soft); color:var(--accent-deep); }
      .tl-ic.int { background:var(--warn-soft); color:#b76e00; }
      .tl-body { flex:1; min-width:0; }
      .tl-top { display:flex; justify-content:space-between; gap:10px; }
      .tl-title { font-weight:600; font-size:14.5px; }
      .tl-amt { font-weight:700; white-space:nowrap; }
      .tl-sub { margin-top:2px; }

      .doc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:13px; margin-top:14px; }
      .doc-card { border-radius:15px; overflow:hidden; background:var(--surface-2); }
      .doc-thumb { aspect-ratio:4/3; display:flex; align-items:center; justify-content:center; cursor:pointer;
        color:var(--muted); background:var(--surface-3); overflow:hidden; }
      .doc-thumb img { width:100%; height:100%; object-fit:cover; transition:transform .2s; }
      .doc-thumb:hover img { transform:scale(1.05); }
      .doc-meta { display:flex; align-items:center; justify-content:space-between; gap:6px; padding:8px 10px; font-size:13px; font-weight:600; }
      .doc-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); display:flex; align-items:center;
        justify-content:center; z-index:50; padding:20px; backdrop-filter:blur(4px); }
      .doc-modal { position:relative; max-width:92vw; max-height:90vh; }
      .doc-close { position:absolute; top:-14px; right:-14px; width:40px; height:40px; border-radius:50%; border:none;
        background:#fff; color:#1d1d1f; font-size:18px; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.4); }
      .doc-img { display:flex; align-items:center; justify-content:center; color:#fff; min-width:200px; min-height:120px; }
      .doc-img img { max-width:92vw; max-height:86vh; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.5); }

      .empty { text-align:center; padding:56px 16px; }
      .empty-icon { color:var(--accent); } .empty h3 { margin-top:14px; }
      .empty .btn { margin-top:16px; }
    </style>`;
  }
}

customElements.define("car-manager-panel", CarManagerPanel);
