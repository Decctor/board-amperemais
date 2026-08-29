import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicHttpUrl, isPublicIpAddress } from "./fetch-public-url";

test("endereços privados, reservados e de metadata são recusados; públicos passam", () => {
	for (const blocked of [
		"127.0.0.1",
		"10.1.2.3",
		"192.168.0.10",
		"172.16.0.1",
		"172.31.255.255",
		"169.254.169.254",
		"100.64.0.1",
		"0.0.0.0",
		"224.0.0.1",
		"255.255.255.255",
		"::1",
		"::",
		"fe80::1",
		"fd00::1",
		"::ffff:127.0.0.1",
		"::ffff:10.0.0.1",
		"64:ff9b::a00:1",
	]) {
		assert.equal(isPublicIpAddress(blocked), false, blocked);
	}
	for (const allowed of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "169.253.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
		assert.equal(isPublicIpAddress(allowed), true, allowed);
	}
	assert.equal(isPublicIpAddress("nao-e-ip"), false);
});

test("só https público passa: http, credenciais, IP privado e host interno são recusados", () => {
	assert.doesNotThrow(() => assertPublicHttpUrl("https://example.com/imagem.png"));
	assert.doesNotThrow(() => assertPublicHttpUrl("https://8.8.8.8/imagem.png"));
	assert.throws(() => assertPublicHttpUrl("http://example.com/imagem.png"), /https/);
	assert.throws(() => assertPublicHttpUrl("ftp://example.com/imagem.png"), /https/);
	assert.throws(() => assertPublicHttpUrl("https://user:senha@example.com/x"), /credenciais/);
	assert.throws(() => assertPublicHttpUrl("https://127.0.0.1/x"), /privado ou reservado/);
	assert.throws(() => assertPublicHttpUrl("https://169.254.169.254/latest/meta-data/"), /privado ou reservado/);
	assert.throws(() => assertPublicHttpUrl("https://[::1]/x"), /privado ou reservado/);
	assert.throws(() => assertPublicHttpUrl("https://localhost/x"), /interno/);
	assert.throws(() => assertPublicHttpUrl("https://intranet/x"), /interno/);
	assert.throws(() => assertPublicHttpUrl("https://storage.local/x"), /interno/);
	assert.throws(() => assertPublicHttpUrl("https://db.internal/x"), /interno/);
	assert.throws(() => assertPublicHttpUrl("nem-url"), /inválida/);
	// O parser WHATWG normaliza hosts IPv4 em hex/decimal para a forma pontuada antes da checagem.
	assert.throws(() => assertPublicHttpUrl("https://0x7f.0x0.0x0.0x1/x"), /privado ou reservado/);
});
