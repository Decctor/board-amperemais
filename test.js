// import ResultsApril from "./results-april.json";

const ResultsApril = require("./results-april.json");
const totalSold = ResultsApril.reduce((acc, item) => acc + Number(item.valor), 0);
const totalCost = ResultsApril.flatMap((s) => s.itens.map((i) => i)).reduce((acc, current) => acc + Number(current.vcusto), 0);
console.log(totalSold, totalCost);
