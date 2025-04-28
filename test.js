// import ResultsApril from "./results-april.json";
const dayjs = require("dayjs");
console.log(dayjs().subtract(5, "hour").format("DD/MM/YYYY").replaceAll("/", ""));
