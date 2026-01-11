"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowLeft,
  MessageCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function AgendarPage() {
  const [aceite, setAceite] = useState(false);

  const [form, setForm] = useState({
    email: "",
    whatsappDDI: "+55",
    whatsapp: "",
    empresa: "",
    site: "",
    nome: "",
    sobrenome: "",
  });

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openWhatsApp(message?: string) {
    const phone = "5511999999999"; // ✅ TROQUE PELO SEU NÚMERO (somente números com DDI)
    const msg = encodeURIComponent(message ?? "Olá! Quero conversar sobre o RecompraCRM.");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fullName = `${form.nome} ${form.sobrenome}`.trim();
    const wa = `${form.whatsappDDI} ${form.whatsapp}`.trim();

    const msg =
      `Olá! Quero conversar sobre o RecompraCRM.\n\n` +
      `*Nome:* ${fullName}\n` +
      `*Empresa:* ${form.empresa}\n` +
      `*Site:* ${form.site}\n` +
      `*Email:* ${form.email}\n` +
      `*WhatsApp:* ${wa}\n\n` +
      `Quero entender se faz sentido pro meu varejo 🙂`;

    openWhatsApp(msg);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fundo criativo sutil (diferenciação) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.20),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/landing-pages/v3" className="flex items-center gap-3">
            <Image
              src="/brand/logo-recompra-horizontal.png"
              alt="RecompraCRM"
              width={170}
              height={34}
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/landing-pages/v3">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white bg-transparent hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>

            <Button
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-black font-semibold hover:from-orange-600 hover:to-orange-700"
              onClick={() => openWhatsApp("Olá! Quero conhecer o RecompraCRM e entender como funciona.")}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10">
     <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Coluna esquerda (desejo + diferenciação) */}
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-orange-200/90 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
                <Sparkles className="w-4 h-4" />
                Portal de atendimento RecompraCRM
              </div>

              <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                Crie relacionamento com seus clientes através de campanhas de cashback.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                  Aumente suas vendas com sua própria base de clientes.
                </span>
              </h1>

              <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
                Uma conversa rápida no WhatsApp pra entender seu cenário e te mostrar
                como o RecompraCRM organiza o relacionamento, ativa clientes e cria
                rotina comercial sem complicação.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Atendimento organizado (nada se perde no WhatsApp)",
                  "Visão do cliente + histórico para vender com contexto",
                  "Campanhas e recompra pra rodar todo mês",
                ].map((t) => (
                  <div key={t} className="flex gap-3">
                    <div className="mt-1 w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-orange-400" />
                    </div>
                    <p className="text-white/80">{t}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white/90">
                  Como é a jornada com a gente
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                  {["Atrair", "Conversar", "Vender", "Recomprar"].map((s, i) => (
                    <div
                      key={s}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-center"
                    >
                      <div className="text-orange-400 font-bold">{i + 1}</div>
                      <div className="mt-1 text-white/80">{s}</div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-white/60">
                  Sem promessa mágica. A gente te mostra o caminho e você decide se faz sentido.
                </p>
              </div>

              <div className="mt-8 text-xs text-white/45">
                Exemplos de segmentos: Moda • Mercado • Materiais • Farmácia • Autopeças
              </div>
            </div>

            {/* Coluna direita (form) */}
            <div className="lg:col-span-7">
              <Card className="w-full bg-zinc-950/80 border border-white/10 p-5 sm:p-6 lg:p-8 rounded-2xl">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Vamos conversar?
                </h2>
                <p className="mt-2 text-white/70">
                  Preencha rapidinho e clique para iniciar no WhatsApp. Sem compromisso.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                  {/* Grid 2 colunas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* E-mail */}
                    <div className="space-y-2">
                      <Label className="text-white/90">
                        E-mail Corporativo<span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        required
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="nome@empresa.com"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <Label className="text-white/90">
                        Número do WhatsApp<span className="text-orange-500">*</span>
                      </Label>
                      <div className="flex gap-3">
                        <Input
                          value={form.whatsappDDI}
                          onChange={(e) => setField("whatsappDDI", e.target.value)}
                          className="w-24 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                          inputMode="tel"
                        />
                        <Input
                          required
                          value={form.whatsapp}
                          onChange={(e) => setField("whatsapp", e.target.value)}
                          placeholder="(DDD) 9XXXX-XXXX"
                          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                          inputMode="tel"
                        />
                      </div>
                    </div>

                    {/* Empresa */}
                    <div className="space-y-2">
                      <Label className="text-white/90">
                        Nome da empresa<span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        required
                        value={form.empresa}
                        onChange={(e) => setField("empresa", e.target.value)}
                        placeholder="Sua empresa"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                      />
                    </div>

                    {/* Site */}
                    <div className="space-y-2">
                      <Label className="text-white/90">
                        Qual o site da sua Empresa?<span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        required
                        value={form.site}
                        onChange={(e) => setField("site", e.target.value)}
                        placeholder="www.site.com"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                      />
                    </div>

                    {/* Nome */}
                    <div className="space-y-2">
                      <Label className="text-white/90">
                        Nome<span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        required
                        value={form.nome}
                        onChange={(e) => setField("nome", e.target.value)}
                        placeholder="João"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                      />
                    </div>

                    {/* Sobrenome */}
                    <div className="space-y-2">
                      <Label className="text-white/90">
                        Sobrenome<span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        required
                        value={form.sobrenome}
                        onChange={(e) => setField("sobrenome", e.target.value)}
                        placeholder="Silva"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Texto privacidade */}
                  <p className="text-white/70 text-sm leading-relaxed">
                    A RecompraCRM está comprometida em proteger e respeitar a sua privacidade.
                  </p>

                  {/* Checkbox */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="comunicacoes"
                      checked={aceite}
                      onCheckedChange={(v) => setAceite(Boolean(v))}
                      className="border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <Label
                      htmlFor="comunicacoes"
                      className="text-white/80 leading-relaxed"
                    >
                      Concordo em receber comunicações da RecompraCRM.
                      <br />
                      <span className="text-white/60">
                        Você permite que a RecompraCRM armazene e processe as informações fornecidas.
                      </span>
                    </Label>
                  </div>

                  {/* Botões */}
                 <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <Button
                      type="submit"
                      disabled={!aceite}
                      className="h-12 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Conversar 10 min no WhatsApp
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 px-6 border-white/20 text-white bg-transparent hover:bg-white/10"
                      onClick={() =>
                        openWhatsApp(
                          "Olá! Antes de preencher, queria só tirar uma dúvida rápida sobre o RecompraCRM 🙂"
                        )
                      }
                    >
                      Só tirar uma dúvida
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <p className="text-xs text-white/60">
                    Sem compromisso. A gente só te ajuda a entender se faz sentido pro seu varejo.
                  </p>
                </form>
              </Card>

              <p className="mt-4 text-xs text-white/45">
                Dica: se sua logo não aparecer, confirme se o arquivo está em{" "}
                <span className="text-white/70">public/brand/logo-recompra-horizontal.png</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé simples */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 text-xs text-white/50 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} RecompraCRM. Todos os direitos reservados.</span>
          <span>Atendimento rápido via WhatsApp.</span>
        </div>
      </footer>
    </div>
  );
}
