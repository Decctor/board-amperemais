import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import { RFM_SEGMENT_OPTIONS } from "./shared";
import type { TTriggerNodeConfigComponentProps } from "./types";
import { TimeDurationUnitsOptions } from "@/utils/select-options";
import SelectInput from "@/components/Inputs/SelectInput";

export function TriggerConfig({ node, updateConfig }: TTriggerNodeConfigComponentProps) {
  switch (node.subtipo) {
    case "NOVA-COMPRA":
      return (
        <NumberInput
          label="VALOR MINIMO DA NOVA COMPRA"
          value={node.configuracao.valorMinimo}
          handleChange={(value) => updateConfig({ valorMinimo: value })}
          placeholder="Ex: 100"
        />
      );

    case "QUANTIDADE-TOTAL-COMPRAS":
      return (
        <NumberInput
          label="QUANTIDADE TOTAL DE COMPRAS"
          value={node.configuracao.quantidade}
          handleChange={(value) => updateConfig({ quantidade: value })}
          placeholder="Ex: 2"
        />
      );

    case "VALOR-TOTAL-COMPRAS":
      return (
        <NumberInput
          label="VALOR TOTAL DE COMPRAS"
          value={node.configuracao.valor}
          handleChange={(value) => updateConfig({ valor: value })}
          placeholder="Ex: 1000"
        />
      );

    case "ENTRADA-SEGMENTACAO":
      return (
        <div className="flex flex-col gap-2">
          <MultipleSelectInput
            label="SEGMENTOS RFM"
            selected={node.configuracao.segmentos ?? []}
            handleChange={(values) => updateConfig({ segmentos: values })}
            options={RFM_SEGMENT_OPTIONS}
            resetOptionLabel="Nenhum segmento"
            onReset={() => updateConfig({ segmentos: [] })}
            width="100%"
          />
        </div>
      );
    case "PERMANENCIA-SEGMENTACAO":
      return (
        <div className="flex flex-col gap-2">
          <MultipleSelectInput
            label="SEGMENTOS RFM"
            selected={node.configuracao.segmentos ?? []}
            handleChange={(values) => updateConfig({ segmentos: values })}
            options={RFM_SEGMENT_OPTIONS}
            resetOptionLabel="Nenhum segmento"
            onReset={() => updateConfig({ segmentos: [] })}
            width="100%"
          />
          <NumberInput
            label="TEMPO DE PERMANÊNCIA (VALOR)"
            value={node.configuracao.tempoValor}
            handleChange={(value) => updateConfig({ tempoValor: value })}
            placeholder="Ex: 10"
            width="100%"
          />
          <SelectInput
            label="TEMPO DE PERMANÊNCIA (MEDIDA)"
            value={node.configuracao.tempoMedida}
            handleChange={(value) => updateConfig({ tempoMedida: value })}
            options={TimeDurationUnitsOptions}
            resetOptionLabel="SELECIONE A MEDIDA"
            onReset={() => updateConfig({ tempoMedida: null })}
            width="100%"
          />
        </div>
      );

    case "CASHBACK-ACUMULADO":
      return (
        <div className="flex flex-col gap-2">
          <NumberInput
            label="VALOR MINIMO DO NOVO CASHBACK"
            value={node.configuracao.valorMinimoNovo}
            handleChange={(value) => updateConfig({ valorMinimoNovo: value })}
            placeholder="Ex: 5"
          />
          <NumberInput
            label="VALOR MINIMO DE CASHBACK TOTAL"
            value={node.configuracao.valorMinimoTotal}
            handleChange={(value) => updateConfig({ valorMinimoTotal: value })}
            placeholder="Ex: 50"
          />
        </div>
      );

    default:
      return (
        <p className="text-xs text-muted-foreground italic">
          Este gatilho nao possui configuracoes adicionais.
        </p>
      );
  }
}
