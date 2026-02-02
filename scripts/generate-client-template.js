// Script to generate the bulk-insert-clients.xlsx template file
// Run with: node scripts/generate-client-template.js

const XLSX = require("xlsx");
const path = require("path");

// Sample data for the template
const templateData = [
	{
		NOME: "João Silva",
		TELEFONE: "(11) 99999-1234",
		EMAIL: "joao.silva@email.com",
		"DATA DE NASCIMENTO": "15/03/1990",
		"CANAL DE AQUISIÇÃO": "Indicação",
		CIDADE: "São Paulo",
		ESTADO: "SP",
		BAIRRO: "Centro",
		CEP: "01310-100",
	},
	{
		NOME: "Maria Santos",
		TELEFONE: "(21) 98888-5678",
		EMAIL: "maria.santos@email.com",
		"DATA DE NASCIMENTO": "22/07/1985",
		"CANAL DE AQUISIÇÃO": "Instagram",
		CIDADE: "Rio de Janeiro",
		ESTADO: "RJ",
		BAIRRO: "Copacabana",
		CEP: "22041-080",
	},
	{
		NOME: "Pedro Oliveira",
		TELEFONE: "(31) 97777-9012",
		EMAIL: "",
		"DATA DE NASCIMENTO": "",
		"CANAL DE AQUISIÇÃO": "Google",
		CIDADE: "Belo Horizonte",
		ESTADO: "MG",
		BAIRRO: "",
		CEP: "",
	},
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(templateData);

// Set column widths
ws["!cols"] = [
	{ wch: 25 }, // NOME
	{ wch: 18 }, // TELEFONE
	{ wch: 30 }, // EMAIL
	{ wch: 20 }, // DATA DE NASCIMENTO
	{ wch: 20 }, // CANAL DE AQUISIÇÃO
	{ wch: 20 }, // CIDADE
	{ wch: 8 }, // ESTADO
	{ wch: 20 }, // BAIRRO
	{ wch: 12 }, // CEP
];

// Append worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "Clientes");

// Write file
const outputPath = path.join(__dirname, "..", "public", "bulk-insert-clients.xlsx");
XLSX.writeFile(wb, outputPath);

console.log(`Template file created at: ${outputPath}`);
console.log("\nTemplate columns:");
console.log("- NOME (obrigatório)");
console.log("- TELEFONE");
console.log("- EMAIL");
console.log("- DATA DE NASCIMENTO (formato: DD/MM/AAAA)");
console.log("- CANAL DE AQUISIÇÃO");
console.log("- CIDADE");
console.log("- ESTADO");
console.log("- BAIRRO");
console.log("- CEP");
