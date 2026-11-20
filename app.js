const DEFAULTS = Object.freeze({ baseRate: 45300, turnkeyRate: 63100 });
const FIXED_RATES = Object.freeze({ pile: 12000, wellMeter: 4000 });
const HOUSE_PHOTOS = Object.freeze({
  optima: { src: "assets/optima.jpg", label: "Фотопривязка: Оптима" },
  lux2: { src: "assets/lux-2.jpg", label: "Фотопривязка: Люкс II" },
  premier2: { src: "assets/premier-2.jpg", label: "Фотопривязка: Премьер II" }
});

const form = document.querySelector("#calculator");
const moduleRows = document.querySelector("#moduleRows");
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

const value = (data, key, fallback = 0) => Math.max(0, Number(data.get(key)) || fallback);

function getState() {
  const data = new FormData(form);
  return {
    modules: [...moduleRows.querySelectorAll(".module-row")].map(row => ({
      width: Math.max(0.1, Number(row.querySelector(".module-width").value) || 0.1),
      length: Math.max(0.1, Number(row.querySelector(".module-length").value) || 0.1),
      count: Math.max(1, Number(row.querySelector(".module-count").value) || 1)
    })),
    floors: value(data, "floors", 1),
    terraceArea: value(data, "terraceArea"),
    terraceCost: value(data, "terraceCost"),
    housePhoto: data.get("housePhoto") || "none",
    packageType: data.get("packageType") || "turnkey",
    pricePerSqm: value(data, "pricePerSqm"),
    flooring: data.get("flooring") || "none",
    windows: data.get("windows") || "white",
    heating: data.get("heating") || "none",
    ceiling: data.get("ceiling") || "none",
    bathrooms: value(data, "bathrooms"),
    foundationPiles: value(data, "foundationPiles"),
    septicLos: value(data, "septicLos"),
    wellMeters: value(data, "wellMeters"),
    caisson: value(data, "caisson"),
    stairs: value(data, "stairs"),
    plinth: value(data, "plinth"),
    airConditioner: value(data, "airConditioner"),
    distance: value(data, "distance"),
    discount: Math.min(50, value(data, "discount")),
    rates: {
      base: value(data, "rateBase"),
      turnkey: value(data, "rateTurnkey"),
      linoleum: value(data, "rateLinoleum"),
      laminate: value(data, "rateLaminate"),
      graphite: value(data, "rateGraphite"),
      convectors: value(data, "rateConvectors"),
      floorHeating: value(data, "rateFloorHeating"),
      combo: value(data, "rateCombo"),
      stretchCeiling: value(data, "rateStretchCeiling"),
      panelCeiling: value(data, "ratePanelCeiling"),
      bathroom: value(data, "rateBathroom"),
      delivery: value(data, "rateDelivery")
    }
  };
}

function calculate(s) {
  const moduleArea = s.modules.reduce((sum, module) => sum + module.width * module.length * module.count, 0);
  const moduleCount = s.modules.reduce((sum, module) => sum + module.count, 0);
  const area = moduleArea * s.floors;
  const base = area * s.pricePerSqm;

  const flooringRates = { none: 0, linoleum: s.rates.linoleum, laminate: s.rates.laminate };
  const flooringIncluded = s.packageType === "turnkey" && s.flooring === "linoleum";
  const flooring = flooringIncluded ? 0 : area * (flooringRates[s.flooring] || 0);

  const windows = s.windows === "graphite" ? moduleCount * s.floors * s.rates.graphite : 0;
  const heatingRates = { none: 0, convectors: s.rates.convectors, floor: s.rates.floorHeating, combo: s.rates.combo };
  const heatingIncluded = s.packageType === "turnkey" && s.heating === "convectors";
  const heating = heatingIncluded ? 0 : area * (heatingRates[s.heating] || 0);

  const ceilingRates = { none: 0, stretch: s.rates.stretchCeiling, panel: s.rates.panelCeiling };
  const ceilingIncluded = s.packageType === "turnkey" && s.ceiling === "stretch";
  const ceiling = ceilingIncluded ? 0 : area * (ceilingRates[s.ceiling] || 0);

  const terrace = s.terraceArea > 0 ? s.terraceCost : 0;
  const bathrooms = Math.max(0, s.bathrooms - 1) * s.rates.bathroom;

  const foundation = s.foundationPiles * FIXED_RATES.pile;
  const well = s.wellMeters * FIXED_RATES.wellMeter;
  const engineering = foundation + s.septicLos + well + s.caisson;

  const delivery = Math.max(0, s.distance - 30) * s.rates.delivery;
  const additional = s.stairs + s.plinth + s.airConditioner + delivery;

  const subtotal = base + flooring + windows + heating + ceiling + terrace + bathrooms + engineering + additional;
  const discount = subtotal * s.discount / 100;
  const total = subtotal - discount;

  return {
    area, moduleCount, base, flooring, windows, heating, ceiling, terrace, bathrooms,
    foundation, well, engineering, delivery, additional, subtotal, discount, total
  };
}

function getIncludedItems(s) {
  const items = [];
  if (s.windows === "white") items.push("Белые окна");
  if (s.packageType === "turnkey" && s.flooring === "linoleum") items.push("Линолеум");
  if (s.packageType === "turnkey" && s.heating === "convectors") items.push("Электрические конвекторы");
  if (s.packageType === "turnkey" && s.ceiling === "stretch") items.push("Натяжной потолок");
  if (s.bathrooms > 0) items.push("Первый санузел");
  return items;
}

function addModuleRow(module = { width: 3, length: 8, count: 1 }) {
  const row = document.createElement("div");
  row.className = "module-row";
  row.innerHTML = `<span class="module-index"></span>
    <label><span>Ширина, м</span><input class="module-width" type="number" min="0.1" max="20" step="0.1" value="${module.width}" inputmode="decimal"></label>
    <label><span>Длина, м</span><input class="module-length" type="number" min="0.1" max="50" step="0.1" value="${module.length}" inputmode="decimal"></label>
    <label><span>Количество</span><input class="module-count" type="number" min="1" max="50" step="1" value="${module.count}" inputmode="numeric"></label>
    <button class="remove-module" type="button" aria-label="Удалить тип модуля">×</button>`;
  moduleRows.append(row);
  refreshModuleRows();
}

function refreshModuleRows() {
  const rows = [...moduleRows.querySelectorAll(".module-row")];
  rows.forEach((row, index) => {
    row.querySelector(".module-index").textContent = `М${index + 1}`;
    row.querySelector(".remove-module").disabled = rows.length === 1;
  });
  render();
}

function row(label, amount, showZero = false) {
  return amount !== 0 || showZero ? `<div><dt>${label}</dt><dd>${money.format(amount)}</dd></div>` : "";
}

function renderPhoto(photoKey) {
  const photo = HOUSE_PHOTOS[photoKey];
  const block = document.querySelector("#photoBinding");
  block.hidden = !photo;
  if (!photo) return;
  document.querySelector("#housePhotoPreview").src = photo.src;
  document.querySelector("#housePhotoPreview").alt = photo.label;
  document.querySelector("#housePhotoCaption").textContent = photo.label;
}

function render() {
  const s = getState();
  const r = calculate(s);
  document.querySelector("#areaPreview").textContent = `${number.format(r.area)} м²`;
  document.querySelector("#headerArea").textContent = `${number.format(r.area)} м²`;
  document.querySelector("#headerModules").textContent = number.format(r.moduleCount);
  document.querySelector("#headerFloors").textContent = number.format(s.floors);
  document.querySelector("#total").textContent = money.format(r.total);
  document.querySelector("#pricePerMeter").textContent = `${money.format(r.total / r.area)} за м²`;

  const typeLabel = `${s.modules.length} ${s.modules.length === 1 ? "тип" : s.modules.length < 5 ? "типа" : "типов"}`;
  const terraceLabel = s.terraceArea ? ` · терраса ${number.format(s.terraceArea)} м²` : "";
  document.querySelector("#specText").textContent = `${typeLabel} · ${number.format(r.moduleCount)} мод. · ${number.format(s.floors)} эт. · ${s.packageType === "base" ? "базовая" : "под ключ"}${terraceLabel}`;
  renderPhoto(s.housePhoto);

  const ceilingPaid = !(s.packageType === "turnkey" && s.ceiling === "stretch") && s.ceiling !== "none";
  const ceilingLabel = s.ceiling === "stretch" ? "Потолок: натяжной" : "Потолок: вагонка";
  const terraceRow = s.terraceArea ? row(`Терраса ${number.format(s.terraceArea)} м²`, r.terrace, true) : "";
  const ceilingRow = ceilingPaid ? row(r.ceiling === 0 ? `${ceilingLabel} (ставка не задана)` : ceilingLabel, r.ceiling, true) : "";
  document.querySelector("#breakdown").innerHTML = [
    row("Дом по ставке", r.base),
    row("Напольное покрытие", r.flooring),
    row("Окна", r.windows),
    row("Отопление", r.heating),
    ceilingRow,
    terraceRow,
    row("Дополнительные санузлы", r.bathrooms),
    row("Инженерные коммуникации", r.engineering),
    row("Дополнительные работы", r.additional)
  ].join("") + `<div class="subtotal"><dt>Подытог</dt><dd>${money.format(r.subtotal)}</dd></div>`;

  const included = getIncludedItems(s);
  document.querySelector("#includedBlock").hidden = included.length === 0;
  document.querySelector("#includedList").innerHTML = included.map(item => `<li>${item}</li>`).join("");
  document.querySelector("#adjustments").innerHTML = row(`Скидка ${number.format(s.discount)}%`, -r.discount);
}

function updateTerraceState() {
  const hasTerrace = Number(document.querySelector("#terraceArea").value) > 0;
  const terraceCost = document.querySelector("#terraceCost");
  terraceCost.disabled = !hasTerrace;
  if (!hasTerrace) terraceCost.value = 0;
}

function updatePackageOptions() {
  const packageType = document.querySelector("#packageType").value;
  const flooring = document.querySelector("#flooring");
  const heating = document.querySelector("#heating");
  const ceiling = document.querySelector("#ceiling");
  const isTurnkey = packageType === "turnkey";

  flooring.innerHTML = isTurnkey
    ? `<option value="linoleum">Линолеум - включен в комплектацию</option><option value="laminate">Ламинат - доплата</option>`
    : `<option value="none" selected>Без напольного покрытия</option><option value="linoleum">Линолеум - доплата</option><option value="laminate">Ламинат - доплата</option>`;
  heating.innerHTML = isTurnkey
    ? `<option value="none">Без отопления</option><option value="convectors" selected>Электрические конвекторы - включены</option><option value="floor">Теплый пол - доплата</option><option value="combo">Комбинированное - доплата</option>`
    : `<option value="none" selected>Без отопления</option><option value="convectors">Электрические конвекторы - доплата</option><option value="floor">Теплый пол - доплата</option><option value="combo">Комбинированное - доплата</option>`;
  ceiling.innerHTML = isTurnkey
    ? `<option value="stretch" selected>Натяжной потолок - включен</option><option value="panel">Вагонка - доплата</option>`
    : `<option value="none" selected>Без отделки потолка</option><option value="stretch">Натяжной потолок - доплата</option><option value="panel">Вагонка - доплата</option>`;
}

function setPackageRate() {
  const type = document.querySelector("#packageType").value;
  updatePackageOptions();
  const rate = type === "base" ? form.elements.rateBase.value : form.elements.rateTurnkey.value;
  document.querySelector("#pricePerSqm").value = rate;
  render();
}

form.addEventListener("input", event => {
  if (event.target.name === "rateBase" && form.elements.packageType.value === "base") form.elements.pricePerSqm.value = event.target.value;
  if (event.target.name === "rateTurnkey" && form.elements.packageType.value === "turnkey") form.elements.pricePerSqm.value = event.target.value;
  render();
});
form.addEventListener("change", event => {
  if (event.target.id === "packageType") setPackageRate();
  else {
    if (event.target.id === "terraceArea") updateTerraceState();
    render();
  }
});

document.querySelector("#addModuleButton").addEventListener("click", () => addModuleRow());
moduleRows.addEventListener("click", event => {
  const button = event.target.closest(".remove-module");
  if (!button || button.disabled) return;
  button.closest(".module-row").remove();
  refreshModuleRows();
});
document.querySelector("#printButton").addEventListener("click", () => window.print());
document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset();
  updatePackageOptions();
  updateTerraceState();
  moduleRows.innerHTML = "";
  addModuleRow();
  document.querySelector("#pricePerSqm").value = DEFAULTS.turnkeyRate;
  render();
});

updatePackageOptions();
updateTerraceState();
addModuleRow();

window.ModularCalculator = { DEFAULTS, FIXED_RATES, calculate, getIncludedItems };
