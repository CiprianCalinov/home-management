/**
 * Car Manager — Lovelace card.
 *
 * A compact fleet-status card for the main Home Assistant dashboard. Reads the
 * same car_manager/get_data websocket snapshot the panel uses and shows status,
 * alerts and what's coming up. Tapping opens the full Car Manager panel.
 *
 * Usage:  type: custom:car-manager-card
 */

const fmtRon = (n) =>
  `${Number(n || 0).toLocaleString("ro-RO", { maximumFractionDigits: 0 })} RON`;
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

class CarManagerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._loaded = false;
  }

  setConfig(config) {
    this._config = config || {};
  }

  getCardSize() {
    return 4;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) {
      this._loaded = true;
      this._load();
      this._timer = setInterval(() => this._load(), 120000);
    }
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
  }

  async _load() {
    try {
      this._data = await this._hass.connection.sendMessagePromise({
        type: "car_manager/get_data",
      });
    } catch (err) {
      this._data = { error: String(err) };
    }
    this._render();
  }

  _open() {
    history.pushState(null, "", "/car-manager");
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  _upcoming(view) {
    const items = [];
    (view.cars || []).forEach((c) => {
      Object.entries(c.legal || {}).forEach(([, i]) => {
        if (i.configured && i.zile_ramase != null && i.zile_ramase <= 60)
          items.push({ car: c.name, label: i.label, days: i.zile_ramase });
      });
    });
    items.sort((a, b) => a.days - b.days);
    return items.slice(0, 3);
  }

  _render() {
    if (!this._data || this._data.error) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding:16px;color:var(--secondary-text-color)">${
        this._data ? esc(this._data.error) : "Se încarcă…"
      }</div></ha-card>`;
      return;
    }
    const view = this._data.view;
    const fleet = view.fleet;
    const ok = fleet.status === "OK";
    const upcoming = this._upcoming(view);

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding:16px 18px; cursor:pointer; }
        .head { display:flex; justify-content:space-between; align-items:center; }
        .title { font-weight:700; font-size:17px; }
        .status { font-size:13px; font-weight:600; padding:5px 12px; border-radius:999px; }
        .status.ok { background:rgba(52,199,89,.14); color:#1f9e46; }
        .status.warn { background:rgba(255,159,10,.16); color:#b76e00; }
        .stats { display:flex; gap:18px; margin-top:14px; }
        .stat .v { font-size:22px; font-weight:800; }
        .stat .l { font-size:12px; color:var(--secondary-text-color); }
        .up { margin-top:14px; border-top:1px solid var(--divider-color); padding-top:10px; }
        .up-row { display:flex; justify-content:space-between; font-size:13px; padding:4px 0; }
        .up-days { font-weight:700; }
        .up-days.soon { color:#b76e00; } .up-days.over { color:#d11; }
        .muted { color:var(--secondary-text-color); font-size:13px; }
      </style>
      <ha-card>
        <div class="head">
          <span class="title">🚗 Car Manager</span>
          <span class="status ${ok ? "ok" : "warn"}">${ok ? "Totul OK" : esc(fleet.status)}</span>
        </div>
        <div class="stats">
          <div class="stat"><div class="v">${fleet.cars}</div><div class="l">mașini</div></div>
          <div class="stat"><div class="v">${fleet.alerts}</div><div class="l">alerte</div></div>
          <div class="stat"><div class="v">${fmtRon(fleet.cost_month)}</div><div class="l">luna asta</div></div>
        </div>
        ${
          upcoming.length
            ? `<div class="up">${upcoming
                .map(
                  (u) => `<div class="up-row"><span>${esc(u.label)} · ${esc(u.car)}</span>
                  <span class="up-days ${u.days < 0 ? "over" : u.days <= 14 ? "soon" : ""}">${
                    u.days < 0 ? `expirat` : `${u.days} zile`
                  }</span></div>`
                )
                .join("")}</div>`
            : `<div class="up muted">Niciun termen apropiat. ✅</div>`
        }
      </ha-card>`;
    this.shadowRoot.querySelector("ha-card").addEventListener("click", () => this._open());
  }
}

customElements.define("car-manager-card", CarManagerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "car-manager-card",
  name: "Car Manager",
  description: "Starea flotei tale (Car Manager) pe dashboard.",
});
