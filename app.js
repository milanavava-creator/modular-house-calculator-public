const DEFAULTS = Object.freeze({ baseRate: 45300, turnkeyRate: 63100 });
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
    packageType: data.get("packageType") || "turnkey", pricePerSqm: value(data, "pricePerSqm"),
    flooring: data.get("flooring"), windows: data.get("windows"), heating: data.get("heating"), bathrooms: value(data, "bathrooms"),
    terraceCost: value(data, "terraceCost"), distance: value(data, "distance"), foundation: value(data, "foundation"),
    well: value(data, "well"), septic: value(data, "septic"), other: value(data, "other"),
    discount: Math.min(50, value(data, "discount")),
    rates: {
      base: value(data, "rateBase"), turnkey: value(data, "rateTurnkey"), linoleum: value(data, "rateLinoleum"), laminate: value(data, "rateLaminate"),
      graphite: value(data, "rateGraphite"), convectors: value(data, "rateConvectors"), floorHeating: value(data, "rateFloorHeating"),
      combo: value(data, "rateCombo"), bathroom: value(data, "rateBathroom"), delivery: value(data, "rateDelivery")
    }
  };
}

function calculate(s) {
  const moduleArea = s.modules.reduce((sum, module) => sum + module.width * module.length * module.count, 0);
  const moduleCount = s.modules.reduce((sum, module) => sum + module.count, 0);
  const area = moduleArea * s.floors;
  const base = area * s.pricePerSqm;
  const flooring = s.flooring === "laminate" ? area * s.rates.laminate : (s.packageType === "base" ? area * s.rates.linoleum : 0);
  const windows = s.windows === "graphite" ? moduleCount * s.floors * s.rates.graphite : 0;
  const heatingRate = { none: 0, convectors: s.rates.convectors, floor: s.rates.floorHeating, combo: s.rates.combo }[s.heating] || 0;
  const heating = s.packageType === "turnkey" && s.heating === "convectors" ? 0 : area * heatingRate;
  const terrace = s.terraceCost;
  const bathroomsIncluded = s.packageType === "turnkey" ? 1 : 0;
  const bathrooms = Math.max(0, s.bathrooms - bathroomsIncluded) * s.rates.bathroom;
  const delivery = Math.max(0, s.distance - 30) * s.rates.delivery;
  const direct = s.foundation + s.well + s.septic + s.other;
  const subtotal = base + flooring + windows + heating + terrace + bathrooms + delivery + direct;
  const discount = subtotal * s.discount / 100;
  const total = subtotal - discount;
  return { area, moduleCount, base, flooring, windows, heating, terrace, bathrooms, delivery, direct, subtotal, discount, total };
}

function getIncludedItems(s) {
  const items = [];
  if (s.windows === "white") items.push("Белые окна");
  if (s.packageType === "turnkey" && s.flooring === "linoleum") items.push("Линолеум");
  if (s.packageType === "turnkey" && s.heating === "convectors") items.push("Электрические конвекторы");
  if (s.packageType === "turnkey" && s.bathrooms > 0) items.push("Первый санузел");
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

function row(label, amount) {
  return amount !== 0 ? `<div><dt>${label}</dt><dd>${money.format(amount)}</dd></div>` : "";
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
  document.querySelector("#specText").textContent = `${typeLabel} · ${number.format(r.moduleCount)} мод. · ${number.format(s.floors)} эт. · ${s.packageType === "base" ? "базовая" : "под ключ"}`;
  document.querySelector("#breakdown").innerHTML = [
    row("Дом по ставке", r.base), row("Напольное покрытие", r.flooring), row("Окна", r.windows), row("Отопление", r.heating),
    row("Терраса", r.terrace), row("Дополнительные санузлы", r.bathrooms), row("Доставка сверх 30 км", r.delivery), row("Индивидуальные работы", r.direct)
  ].join("") + `<div class="subtotal"><dt>Подытог</dt><dd>${money.format(r.subtotal)}</dd></div>`;
  const included = getIncludedItems(s);
  document.querySelector("#includedBlock").hidden = included.length === 0;
  document.querySelector("#includedList").innerHTML = included.map(item => `<li>${item}</li>`).join("");
  document.querySelector("#adjustments").innerHTML = row(`Скидка ${number.format(s.discount)}%`, -r.discount);
}

function updatePackageOptions() {
  const packageType = document.querySelector("#packageType").value;
  const flooring = document.querySelector("#flooring");
  const heating = document.querySelector("#heating");
  const isTurnkey = packageType === "turnkey";
  flooring.innerHTML = isTurnkey
    ? `<option value="linoleum">Линолеум - включен в комплектацию</option><option value="laminate">Ламинат - доплата</option>`
    : `<option value="none">Без напольного покрытия</option><option value="linoleum">Линолеум - доплата</option><option value="laminate">Ламинат - доплата</option>`;
  heating.innerHTML = isTurnkey
    ? `<option value="none">Без отопления</option><option value="convectors" selected>Электрические конвекторы - включены</option><option value="floor">Теплый пол - доплата</option><option value="combo">Комбинированное - доплата</option>`
    : `<option value="none" selected>Без отопления</option><option value="convectors">Электрические конвекторы - доплата</option><option value="floor">Теплый пол - доплата</option><option value="combo">Комбинированное - доплата</option>`;
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
form.addEventListener("change", event => event.target.id === "packageType" ? setPackageRate() : render());
document.querySelector("#addModuleButton").addEventListener("click", () => addModuleRow());
moduleRows.addEventListener("click", event => {
  const button = event.target.closest(".remove-module");
  if (!button || button.disabled) return;
  button.closest(".module-row").remove();
  refreshModuleRows();
});
document.querySelector("#printButton").addEventListener("click", () => window.print());
document.querySelector("#resetButton").addEventListener("click", () => { form.reset(); updatePackageOptions(); moduleRows.innerHTML = ""; addModuleRow(); document.querySelector("#pricePerSqm").value = DEFAULTS.turnkeyRate; render(); });
updatePackageOptions();
addModuleRow();

window.ModularCalculator = { DEFAULTS, calculate, getIncludedItems };
