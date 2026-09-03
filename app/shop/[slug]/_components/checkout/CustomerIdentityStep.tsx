"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatToPhone } from "@/lib/formatting";
import { useShopClientLookup } from "@/lib/queries/shop";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "../ShopProvider";

type CustomerIdentityStepProps = {
  onNext: () => void;
};

// Keeps the focused field visible after the mobile keyboard finishes opening.
function scrollIntoViewOnFocus(event: React.FocusEvent<HTMLInputElement>) {
  const target = event.target;
  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 300);
}

export default function CustomerIdentityStep({
  onNext,
}: CustomerIdentityStepProps) {
  const { orgId, orderState } = useShop();
  const { customer } = orderState.state;

  const [nome, setNome] = useState(customer.nome || "");
  const [phone, setPhone] = useState(
    customer.telefone ? formatToPhone(customer.telefone) : "",
  );

  const {
    data: lookupData,
    isLoading: isLookingUp,
    isSuccess,
  } = useShopClientLookup({ orgId, telefone: phone });
  const client = lookupData?.client ?? null;

  useEffect(() => {
    if (isSuccess && client) {
      orderState.updateCustomer({
        id: client.id,
        nome: client.nome,
        telefone: client.telefone,
      });
    } else if (isSuccess && !client && phone.length === 15) {
      orderState.updateCustomer({
        id: null,
        telefone: phone.replace(/\D/g, ""),
      });
    }
  }, [isSuccess, client, phone]);

  const showFoundCard = isSuccess && !!client;
  const showNewClientForm = isSuccess && !client && phone.length === 15;

  const handleSubmitExisting = () => {
    onNext();
  };

  const handleSubmitNew = () => {
    orderState.updateCustomer({
      telefone: phone.replace(/\D/g, ""),
      nome: nome.trim() || null,
      cpfCnpj: null,
    });
    onNext();
  };

  return (
    <AnimatePresence mode="wait">
      {showFoundCard ? (
        <motion.div
          key="profile-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full flex-col items-center gap-5 rounded-3xl border-2 border-brand/20 bg-brand/5 p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-center"
          >
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 500,
                damping: 25,
              }}
              className="mb-1 text-xs font-bold uppercase tracking-widest text-brand"
            >
              Perfil encontrado
            </motion.p>
            <p className="font-black text-2xl text-foreground">
              {client!.nome}
            </p>
            <p className="font-bold text-brand">
              {formatToPhone(client!.telefone)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="flex w-full flex-col gap-2"
          >
            <Button
              variant="brand"
              className="h-12 w-full rounded-2xl font-black text-base"
              onClick={handleSubmitExisting}
            >
              CONTINUAR
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-brand hover:bg-brand/10 hover:text-brand/80"
              onClick={() => setPhone("")}
            >
              USAR OUTRO TELEFONE
            </Button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="input-form"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex w-full flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="shop-customer-phone"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Número do WhatsApp
            </Label>
            <div className="relative">
              <Input
                id="shop-customer-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(formatToPhone(e.target.value))}
                className="h-12 pr-10 text-base"
                onFocus={scrollIntoViewOnFocus}
              />
              <AnimatePresence>
                {isLookingUp && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {isLookingUp && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Buscando registros...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showNewClientForm && (
              <motion.div
                key="new-client-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-4 rounded-2xl border bg-muted/50 p-4"
              >
                <p className="text-pretty text-sm text-muted-foreground">
                  Parece que você ainda não tem um cadastro. Preencha seus dados
                  para continuar.
                </p>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="shop-customer-name"
                    className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="shop-customer-name"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="h-12 text-base"
                    onFocus={scrollIntoViewOnFocus}
                  />
                </div>

                <Button
                  variant="brand"
                  className="h-12 w-full rounded-2xl font-black"
                  onClick={handleSubmitNew}
                  disabled={!nome.trim()}
                >
                  CONTINUAR
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
