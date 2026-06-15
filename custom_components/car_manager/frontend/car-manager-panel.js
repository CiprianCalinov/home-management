/**
 * Car Manager — Home Assistant sidebar panel.
 *
 * Self-contained web component (no build step). Talks to the backend through
 * the car_manager/* websocket commands. Loads once, re-renders after each
 * mutation from the snapshot the backend returns.
 */

const LEGAL_DEFS = [
  { key: "rca", label: "RCA", icon: "🛡️" },
  { key: "itp", label: "ITP", icon: "🔧" },
  { key: "rovinieta", label: "Rovinietă", icon: "🛣️" },
  { key: "casco", label: "CASCO", icon: "🚙" },
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

const TABS = [
  ["acasa", "Acasă", "🏠"],
  ["masini", "Mașini", "🚗"],
  ["costuri", "Costuri", "💳"],
  ["statistici", "Statistici", "📈"],
  ["combustibil", "Combustibil", "⛽"],
  ["anvelope", "Anvelope", "🛞"],
  ["dotari", "Dotări", "🧰"],
  ["baterie", "Baterie", "🔋"],
  ["setari", "Setări", "⚙️"],
];

const TIRE_SEASONS = ["", "vară", "iarnă", "all-season"];

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
  JHM: "Honda", SHH: "Honda", JHL: "Honda",
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
    return `
      <div class="banner">
        <div class="banner-main">
          <div class="logo">🚗</div>
          <div class="banner-text">
            <div class="brand">CAR MANAGER</div>
            <h1>Car Manager</h1>
            <p>Administrare auto într-un singur loc: termene legale, revizii, costuri, consum, anvelope, dotări și baterie.</p>
            <div class="badge">HA · LOCAL · v0.1.0</div>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><span class="stat-label">Stare flotă</span><span class="stat-val ${
            fleet.status === "OK" ? "ok" : "warn"
          }">${esc(fleet.status)}</span></div>
          <div class="stat"><span class="stat-val">${fleet.cars}</span><span class="stat-sub">mașini</span></div>
          <div class="stat"><span class="stat-val ${fleet.alerts ? "warn" : ""}">${
      fleet.alerts
    }</span><span class="stat-sub">alerte</span></div>
          <div class="stat"><span class="stat-val">${fmtRon(
            fleet.cost_year
          )}</span><span class="stat-sub">an curent</span></div>
        </div>
      </div>`;
  }

  _tabbar() {
    return `<nav class="tabs">${TABS.map(
      ([id, label, icon]) =>
        `<button data-tab="${id}" class="tab ${
          this._tab === id ? "active" : ""
        }"><span>${icon}</span>${label}</button>`
    ).join("")}</nav>`;
  }

  _tabContent() {
    switch (this._tab) {
      case "acasa":
        return this._home();
      case "masini":
        return this._editing ? this._carForm() : this._cars();
      case "costuri":
        return this._costs();
      case "statistici":
        return this._stats();
      case "combustibil":
        return this._fuel();
      case "anvelope":
        return this._tires();
      case "dotari":
        return this._equipment();
      case "baterie":
        return this._battery();
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
          ${this._kpi("Autovehicule", cars.length, "mașini")}
          ${this._kpi("Alerte", view.fleet.alerts, `${view.fleet.critical} critice`)}
          ${this._kpi("Cost an curent", fmtRon(costs.total_year), "intervenții & taxe")}
          ${this._kpi("Combustibil", fmtRon(costs.fuel_total_year), `total ${costs.year}`)}
          ${this._kpi("Total an", fmtRon(costs.grand_total_year), "toate cheltuielile")}
        </div>
      </section>

      <section class="card">
        <div class="row-between">
          <div class="overline">AUTOVEHICULE</div>
          <button class="btn primary" data-action="add-car">+ Adaugă autovehicul</button>
        </div>
        <div class="car-grid">
          ${cars.map((c) => this._carCard(c)).join("")}
        </div>
      </section>

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
    const chips = LEGAL_DEFS.map((d) => {
      const info = c.legal[d.key];
      return `<div class="chip ${this._chipClass(info)}">
        <div class="chip-label">${d.label}</div>
        <div class="chip-val">${this._chipText(info)}</div>
      </div>`;
    }).join("");

    const svc = Object.values(c.service)
      .filter((s) => s.alert)
      .map((s) => `<span class="tag warn">${esc(s.label)}</span>`)
      .join("");

    return `
      <div class="car">
        <div class="row-between">
          <div class="car-name">🚘 ${esc(c.name)}</div>
          <div class="car-actions">
            <button class="icon-btn" data-action="edit-car" data-id="${c.id}" title="Editează">✏️</button>
            <button class="icon-btn" data-action="del-car" data-id="${c.id}" title="Șterge">🗑️</button>
          </div>
        </div>
        <div class="muted small">${esc(c.make || "")} ${esc(c.model || "")} · ${
      c.mileage ? c.mileage.toLocaleString("ro-RO") + " km" : "—"
    }</div>
        <div class="chips">${chips}</div>
        ${svc ? `<div class="tags">${svc}</div>` : ""}
      </div>`;
  }

  // ----------------------------------------------------------- MAȘINI list
  _cars() {
    const cars = this._data.view.cars;
    return `
      <section class="card">
        <div class="row-between">
          <div><div class="overline">MAȘINI</div><h2>Autovehiculele tale</h2></div>
          <button class="btn primary" data-action="add-car">+ Adaugă autovehicul</button>
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
    const raw = this._editingRaw();
    const e = this._editing;
    const legal = (e.legal = e.legal || (raw && raw.legal) || {});
    const service = (e.service = e.service || (raw && raw.service) || {});
    const isNew = !e.id;

    const legalInputs = LEGAL_DEFS.map(
      (d) => `
      <label>${d.label} expiră la
        <input type="date" data-f="legal.${d.key}" value="${esc(legal[d.key] || "")}">
      </label>`
    ).join("");

    const serviceInputs = SERVICE_DEFS.map((d) => {
      const s = service[d.key] || {};
      return `
        <div class="svc-row">
          <div class="svc-label">${d.label}</div>
          ${
            d.date
              ? `<label class="inline">Ultima dată<input type="date" data-f="service.${d.key}.last_date" value="${esc(
                  s.last_date || ""
                )}"></label>`
              : ""
          }
          ${
            d.km
              ? `<label class="inline">La km<input type="number" data-f="service.${d.key}.last_km" value="${
                  s.last_km ?? ""
                }"></label>`
              : ""
          }
        </div>`;
    }).join("");

    return `
      <section class="card">
        <div class="overline">${isNew ? "ADAUGĂ" : "EDITEAZĂ"}</div>
        <h2>${isNew ? "Autovehicul nou" : esc(e.name || "Autovehicul")}</h2>

        <h3>Date generale</h3>
        ${this._identityGrid(e)}
        <div class="form-actions" style="justify-content:flex-start">
          <button class="btn" type="button" data-action="scan-talon">📷 Scanează talonul</button>
        </div>

        <h3>Termene legale</h3>
        <div class="form-grid">${legalInputs}</div>

        <h3>Revizii & consumabile</h3>
        <div class="svc-list">${serviceInputs}</div>

        <h3>Dotări</h3>
        <div class="form-grid">
          <label>Trusă medicală expiră<input type="date" data-f="equipment.trusa_medicala" value="${esc(
            (e.equipment && e.equipment.trusa_medicala) || ""
          )}"></label>
          <label>Stingător expiră<input type="date" data-f="equipment.stingator" value="${esc(
            (e.equipment && e.equipment.stingator) || ""
          )}"></label>
          <label class="check"><input type="checkbox" data-f="equipment.vesta" ${
            e.equipment && e.equipment.vesta ? "checked" : ""
          }> Vestă reflectorizantă</label>
          <label class="check"><input type="checkbox" data-f="equipment.triunghi" ${
            e.equipment && e.equipment.triunghi ? "checked" : ""
          }> Triunghi reflectorizant</label>
        </div>

        <h3>Baterie</h3>
        <div class="form-grid">
          <label>Data montării<input type="date" data-f="battery.install_date" value="${esc(
            (e.battery && e.battery.install_date) || ""
          )}"></label>
          <label>Garanție (luni)<input type="number" data-f="battery.warranty_months" value="${
            (e.battery && e.battery.warranty_months) ?? 48
          }"></label>
        </div>

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

  _decodeVin() {
    const vinEl = this.shadowRoot.getElementById("f-vin");
    const vin = (vinEl.value || "").trim().toUpperCase();
    vinEl.value = vin;
    if (vin.length !== 17) {
      this._toast("VIN-ul trebuie să aibă exact 17 caractere.");
      return;
    }
    const make = WMI_MAKE[vin.slice(0, 3)] || null;
    const year = vinModelYear(vin[9]);
    if (make) {
      const makeSel = this.shadowRoot.getElementById("f-make-select");
      makeSel.value = Object.prototype.hasOwnProperty.call(CAR_MAKES, make) ? make : "__other__";
      makeSel.dispatchEvent(new Event("change"));
      if (makeSel.value === "__other__") {
        this.shadowRoot.getElementById("f-make-custom").value = make;
      }
    }
    if (year) this.shadowRoot.getElementById("f-year").value = year;
    const parts = [];
    if (make) parts.push(make);
    if (year) parts.push(year);
    this._toast(
      parts.length
        ? `Din VIN: ${parts.join(", ")}. Alege modelul din listă.`
        : "Nu am putut decoda marca/anul din acest VIN."
    );
  }

  _editingRaw() {
    if (!this._editing || !this._editing.id) return null;
    return (this._data.raw.cars || {})[this._editing.id] || null;
  }

  // ----------------------------------------------------------- COSTURI
  _costs() {
    const costs = this._data.view.costs;
    const raw = this._data.raw.costs || [];
    const cars = this._data.raw.cars || {};
    const list = [...raw].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return `
      <section class="card">
        <div class="overline">COSTURI</div>
        <h2>Costuri complete</h2>
        <div class="kpis">
          ${this._kpi("Intervenții & taxe", fmtRon(costs.total_year), "an curent")}
          ${this._kpi("Combustibil", fmtRon(costs.fuel_total_year), "an curent")}
          ${this._kpi("Total", fmtRon(costs.grand_total_year), `${costs.year}`)}
        </div>
      </section>

      <section class="card">
        <h3>Adaugă cheltuială</h3>
        <div class="form-grid">
          <label>Mașină<select id="cost-car">${this._carOptions()}</select></label>
          <label>Data<input type="date" id="cost-date" value="${this._today()}"></label>
          <label>Categorie<select id="cost-cat">${COST_CATEGORIES.map(
            ([v, l]) => `<option value="${v}">${l}</option>`
          ).join("")}</select></label>
          <label>Sumă (RON)<input type="number" id="cost-amount" step="0.01"></label>
          <label>Notă<input id="cost-note"></label>
        </div>
        <div class="form-actions">
          <button class="btn" data-action="scan-cost">📷 Scanează bon</button>
          <button class="btn primary" data-action="add-cost">Adaugă</button>
        </div>
      </section>

      <section class="card">
        <h3>Istoric cheltuieli</h3>
        ${
          list.length
            ? `<table class="tbl"><thead><tr><th>Data</th><th>Mașină</th><th>Categorie</th><th>Sumă</th><th>Notă</th><th></th></tr></thead><tbody>${list
                .map(
                  (c) => `<tr>
            <td>${esc(c.date || "")}</td>
            <td>${esc((cars[c.car_id] || {}).name || "—")}</td>
            <td>${esc(c.category)}</td>
            <td>${fmtRon(c.amount)}</td>
            <td>${esc(c.note || "")}</td>
            <td><button class="icon-btn" data-action="del-cost" data-id="${c.id}">🗑️</button></td>
          </tr>`
                )
                .join("")}</tbody></table>`
            : `<div class="muted">Nicio cheltuială înregistrată.</div>`
        }
      </section>`;
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
          <button class="btn" data-action="scan-fuel">📷 Scanează bon</button>
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
            <td><button class="icon-btn" data-action="del-fuel" data-id="${f.id}">🗑️</button></td>
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
          <div class="car-name">🛞 ${esc(c.name)}</div>
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
    return `<section class="card"><div class="overline">DOTĂRI</div><h2>Echipamente obligatorii</h2>
      ${cars
        .map((c) => {
          const eq = c.equipment || {};
          return `<div class="car">
          <div class="row-between"><div class="car-name">🚘 ${esc(c.name)}</div>
          <button class="btn" data-action="edit-car" data-id="${c.id}">Editează</button></div>
          <div class="tags">
            <span class="tag ${eq.trusa_medicala ? "" : "warn"}">Trusă: ${esc(eq.trusa_medicala || "neconfigurat")}</span>
            <span class="tag ${eq.stingator ? "" : "warn"}">Stingător: ${esc(eq.stingator || "neconfigurat")}</span>
            <span class="tag ${eq.vesta ? "ok" : "warn"}">Vestă ${eq.vesta ? "✅" : "❌"}</span>
            <span class="tag ${eq.triunghi ? "ok" : "warn"}">Triunghi ${eq.triunghi ? "✅" : "❌"}</span>
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
          return `<div class="car"><div class="row-between"><div class="car-name">🔋 ${esc(
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
      <div class="empty-icon">🚗</div>
      <h3>Nicio mașină încă</h3>
      <p class="muted">Adaugă primul autovehicul ca să urmărești termene, revizii și costuri.</p>
      <button class="btn primary" data-action="add-car">+ Adaugă autovehicul</button>
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
        this._render();
      })
    );

    root.querySelectorAll("[data-action]").forEach((el) =>
      el.addEventListener("click", (ev) => this._onAction(el.dataset.action, el, ev))
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
        this._editing = {};
        this._render();
        break;
      case "edit-car": {
        const raw = (this._data.raw.cars || {})[el.dataset.id];
        this._tab = "masini";
        this._editing = JSON.parse(JSON.stringify(raw || {}));
        this._render();
        break;
      }
      case "del-car":
        if (confirm("Ștergi acest autovehicul și toate datele asociate?"))
          this._mutate("delete_car", { car_id: el.dataset.id });
        break;
      case "cancel-car":
        this._editing = null;
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
    // attach default intervals for service items that have data
    SERVICE_DEFS.forEach((d) => {
      const s = car.service && car.service[d.key];
      if (s && (s.last_date || s.last_km != null)) {
        Object.assign(s, SERVICE_INTERVALS[d.key]);
      }
    });
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
    const entry = {
      car_id: g("cost-car").value,
      date: g("cost-date").value,
      category: g("cost-cat").value,
      amount: Number(g("cost-amount").value || 0),
      note: g("cost-note").value,
    };
    if (!entry.car_id || !entry.amount) {
      this._toast("Alege mașina și introdu suma.");
      return;
    }
    this._mutate("add_cost", { entry });
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
    this._setField("fuel-date", d.date);
    this._setField("fuel-liters", d.liters);
    this._setField("fuel-price", d.price_total);
    this._setField("fuel-odo", d.odometer);
    this._toast("Date completate din bon. Verifică și apasă Adaugă bon.");
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

  _setMakeModel(make, model) {
    if (make) {
      const ms = this.shadowRoot.getElementById("f-make-select");
      if (ms) {
        ms.value = Object.prototype.hasOwnProperty.call(CAR_MAKES, make) ? make : "__other__";
        ms.dispatchEvent(new Event("change"));
        if (ms.value === "__other__")
          this.shadowRoot.getElementById("f-make-custom").value = make;
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
      :host { display:block; background:#f3f5f8; min-height:100%; color:#1f2937;
        font-family: var(--paper-font-body1_-_font-family, "Roboto", system-ui, sans-serif); }
      .wrap { max-width:1200px; margin:0 auto; padding:16px; box-sizing:border-box; }
      .loading { padding:48px; text-align:center; color:#6b7280; }
      h1,h2,h3 { margin:0 0 8px; }
      h2 { font-size:22px; } h3 { font-size:16px; margin-top:18px; }
      .muted { color:#6b7280; } .small { font-size:13px; }
      .overline { font-size:11px; letter-spacing:.08em; color:#9ca3af; font-weight:700; }
      .row-between { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }

      .banner { display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap;
        background:radial-gradient(120% 140% at 80% 0%,#22d3ee 0%,#0891b2 45%,#0e7490 100%); color:#fff;
        border-radius:24px; padding:26px 28px; box-shadow:0 14px 40px rgba(8,145,178,.30);
        position:relative; overflow:hidden; }
      .banner::after { content:"🚗"; position:absolute; right:240px; bottom:-30px; font-size:160px;
        opacity:.12; transform:rotate(-8deg); pointer-events:none; }
      .banner-main { display:flex; gap:18px; align-items:flex-start; z-index:1; }
      .logo { font-size:38px; background:rgba(255,255,255,.18); width:66px; height:66px;
        border-radius:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .brand { font-size:11px; letter-spacing:.18em; font-weight:800; opacity:.85; }
      .banner h1 { font-size:30px; font-weight:800; margin:2px 0 0; }
      .banner p { margin:6px 0 0; max-width:520px; opacity:.92; font-size:13px; }
      .badge { display:inline-block; margin-top:12px; font-size:11px; font-weight:700; letter-spacing:.06em;
        background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.25);
        padding:5px 12px; border-radius:999px; }
      .stats { display:flex; flex-direction:column; gap:10px; min-width:180px; z-index:1; }
      .stat { background:#fff; color:#0f172a; border-radius:14px; padding:10px 16px;
        box-shadow:0 4px 14px rgba(0,0,0,.12); display:flex; flex-direction:column; }
      .stat-label { font-size:11px; color:#64748b; }
      .stat-sub { font-size:11px; color:#64748b; order:2; }
      .stat-val { font-size:22px; font-weight:800; order:1; }
      .stat-val.ok { color:#059669; } .stat-val.warn { color:#d97706; }

      .tabs { position:sticky; bottom:14px; display:flex; gap:4px; overflow-x:auto; margin-top:18px;
        background:#fff; border-radius:18px; padding:8px; box-shadow:0 8px 28px rgba(0,0,0,.14); z-index:5; }
      .tabs::-webkit-scrollbar { height:0; }
      .tab { border:none; background:transparent; color:#64748b; padding:8px 12px; border-radius:12px;
        font-size:12px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px;
        white-space:nowrap; min-width:62px; }
      .tab.active { background:#0891b2; color:#fff; }
      .tab span { font-size:18px; }

      .card { background:#fff; border-radius:18px; padding:20px; margin-bottom:16px;
        box-shadow:0 2px 10px rgba(0,0,0,.05); }

      .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-top:12px; }
      .kpi { background:#f8fafc; border:1px solid #eef2f7; border-radius:14px; padding:14px; }
      .kpi-label { font-size:12px; color:#6b7280; } .kpi-val { font-size:22px; font-weight:800; margin:4px 0; }
      .kpi-sub { font-size:12px; color:#9ca3af; }

      .car-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:14px; margin-top:12px; }
      .car { border:1px solid #eef2f7; border-radius:14px; padding:14px; background:#fff; }
      .car-name { font-weight:700; } .car-actions { display:flex; gap:4px; }
      .chips { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:10px; }
      .chip { border-radius:10px; padding:8px 6px; text-align:center; border:1px solid #e5e7eb; }
      .chip-label { font-size:10px; color:#6b7280; } .chip-val { font-size:12px; font-weight:700; }
      .chip.green { background:#ecfdf5; border-color:#a7f3d0; } .chip.green .chip-val { color:#047857; }
      .chip.orange { background:#fffbeb; border-color:#fde68a; } .chip.orange .chip-val { color:#b45309; }
      .chip.red { background:#fef2f2; border-color:#fecaca; } .chip.red .chip-val { color:#b91c1c; }
      .chip.muted { background:#f9fafb; } .chip.muted .chip-val { color:#9ca3af; }

      .tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
      .tag { font-size:12px; background:#f1f5f9; border-radius:999px; padding:4px 10px; }
      .tag.warn { background:#fff7ed; color:#c2410c; } .tag.ok { background:#ecfdf5; color:#047857; }

      .alert-row { display:flex; justify-content:space-between; align-items:center; gap:12px;
        padding:12px; border:1px solid #eef2f7; border-radius:12px; margin-top:8px; }
      .alert-row.critic { border-color:#fecaca; background:#fef2f2; }
      .pill { font-size:12px; font-weight:700; border-radius:999px; padding:4px 12px; background:#e0f2fe; color:#0369a1; }
      .pill.critic { background:#fee2e2; color:#b91c1c; } .pill.atentie { background:#fef3c7; color:#b45309; }

      .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:10px; }
      label { display:flex; flex-direction:column; font-size:13px; color:#374151; gap:4px; }
      label.inline { flex-direction:row; align-items:center; gap:6px; }
      label.check { flex-direction:row; align-items:center; gap:8px; }
      input, select { padding:9px 10px; border:1px solid #d1d5db; border-radius:10px; font-size:14px;
        font-family:inherit; background:#fff; color:#1f2937; }
      input:focus, select:focus { outline:2px solid #0891b2; outline-offset:0; border-color:#0891b2; }
      .svc-list { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
      .svc-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; border:1px solid #eef2f7;
        border-radius:10px; padding:8px 12px; }
      .svc-label { font-weight:600; min-width:120px; }
      .svc-row input { max-width:160px; }
      .vin-row { display:flex; gap:6px; } .vin-row input { flex:1; min-width:0; }

      .form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:16px; flex-wrap:wrap; }
      .btn { border:1px solid #d1d5db; background:#fff; padding:9px 16px; border-radius:10px; cursor:pointer;
        font-size:14px; color:#374151; }
      .btn.primary { background:#0891b2; border-color:#0891b2; color:#fff; font-weight:600; }
      .btn.file { display:inline-flex; align-items:center; }
      .icon-btn { border:none; background:transparent; cursor:pointer; font-size:16px; padding:4px; border-radius:8px; }
      .icon-btn:hover { background:#f3f4f6; }

      .tbl { width:100%; border-collapse:collapse; margin-top:8px; font-size:13px; }
      .tbl th { text-align:left; color:#6b7280; font-weight:600; padding:8px; border-bottom:1px solid #eef2f7; }
      .tbl td { padding:8px; border-bottom:1px solid #f3f4f6; }

      .bar-row { display:flex; align-items:center; gap:12px; margin:8px 0; }
      .bar-label { width:170px; font-size:13px; } .bar-val { width:110px; text-align:right; font-weight:600; font-size:13px; }
      .bar { flex:1; background:#f1f5f9; border-radius:999px; height:10px; overflow:hidden; }
      .bar-fill { height:100%; background:linear-gradient(90deg,#0891b2,#22d3ee); border-radius:999px; }

      .empty { text-align:center; padding:36px 16px; }
      .empty-icon { font-size:48px; } .empty h3 { margin-top:8px; }
      .empty .btn { margin-top:12px; }
    </style>`;
  }
}

customElements.define("car-manager-panel", CarManagerPanel);
