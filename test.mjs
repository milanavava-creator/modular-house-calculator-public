import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const fixedRatesSource = source.match(/const FIXED_RATES = Object\.freeze\([\s\S]*?\);/)?.[0];
const calculationSource = source.match(/function calculate\(s\) \{[\s\S]*?\n\}/)?.[0];
const includedSource = source.match(/function getIncludedItems\(s\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(fixedRatesSource, "FIXED_RATES not found");
assert.ok(calculationSource, "calculate() not found");
assert.ok(includedSource, "getIncludedItems() not found");

const context = {};
vm.createContext(context);
vm.runInContext(`${fixedRatesSource}\n${calculationSource}\n${includedSource}\nglobalThis.calculate = calculate; globalThis.getIncludedItems = getIncludedItems;`, context);

const baseState = {
  modules: [{ width: 3, length: 8, count: 2 }],
  floors: 1,
  terraceArea: 12,
  terraceCost: 500000,
  packageType: "base",
  pricePerSqm: 45300,
  flooring: "none",
  windows: "white",
  heating: "none",
  ceiling: "none",
  bathrooms: 1,
  foundationPiles: 0,
  septicLos: 0,
  wellMeters: 0,
  caisson: 0,
  stairs: 0,
  plinth: 0,
  airConditioner: 0,
  distance: 30,
  discount: 0,
  rates: {
    linoleum: 2500,
    laminate: 4500,
    graphite: 120000,
    convectors: 2200,
    floorHeating: 4200,
    combo: 6500,
    stretchCeiling: 0,
    panelCeiling: 3000,
    bathroom: 250000,
    delivery: 250
  }
};

const base = context.calculate(baseState);
assert.equal(base.area, 48);
assert.equal(base.flooring, 0, "Без напольного покрытия не должно добавлять линолеум");
assert.equal(base.bathrooms, 0, "Первый санузел не должен считаться доплатой");
assert.equal(base.terrace, 500000, "Терраса должна добавляться общей ручной суммой");

const engineering = context.calculate({
  ...baseState,
  terraceArea: 0,
  terraceCost: 500000,
  foundationPiles: 10,
  wellMeters: 30,
  septicLos: 100000,
  caisson: 80000
});
assert.equal(engineering.terrace, 0, "Без выбранной террасы сумма не учитывается");
assert.equal(engineering.foundation, 120000);
assert.equal(engineering.well, 120000);
assert.equal(engineering.engineering, 420000);

const additional = context.calculate({
  ...baseState,
  stairs: 90000,
  plinth: 110000,
  airConditioner: 70000,
  distance: 80
});
assert.equal(additional.delivery, 12500);
assert.equal(additional.additional, 282500);

const turnkey = {
  ...baseState,
  packageType: "turnkey",
  pricePerSqm: 63100,
  flooring: "linoleum",
  heating: "convectors",
  ceiling: "stretch",
  bathrooms: 2
};
const turnkeyResult = context.calculate(turnkey);
assert.equal(turnkeyResult.flooring, 0);
assert.equal(turnkeyResult.heating, 0);
assert.equal(turnkeyResult.ceiling, 0);
assert.equal(turnkeyResult.bathrooms, 250000);
assert.deepEqual(Array.from(context.getIncludedItems(turnkey)), ["Белые окна", "Линолеум", "Электрические конвекторы", "Натяжной потолок", "Первый санузел"]);

const panelCeiling = context.calculate({ ...turnkey, ceiling: "panel" });
assert.equal(panelCeiling.ceiling, 144000);

console.log("Public SIBRA calculator formulas: OK");
