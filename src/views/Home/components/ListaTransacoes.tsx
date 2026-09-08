import {Text, View} from 'react-native';
import type {ItemTransacao} from '../../../models/itensTransacao';
import type {Transacoes} from '../../../models/transacoesModel';
import {sharedStyles} from '../../../theme';
import TransacaoItem from './TransacaoItem';
import React from "react";

type ListaTransacoesProps = {
  transacoes: Transacoes[];
  itensPorTransacao: Map<string, ItemTransacao[]>;
  nomeEmpresa: (id?: string | null) => string;
  onRemover: (id: string) => void;
};

/** Cartao com todos os lancamentos registrados. */
export default function ListaTransacoes({
                                          transacoes,
                                          itensPorTransacao,
                                          nomeEmpresa,
                                          onRemover,
                                        }: ListaTransacoesProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Lancamentos</Text>

      {transacoes.length === 0 ? (
        <Text style={sharedStyles.inlineEmptyText}>Adicione o primeiro gasto para comecar.</Text>
      ) : (
        transacoes.map((transacao) => (
          <TransacaoItem
            key={transacao.id}
            transacao={transacao}
            itens={itensPorTransacao.get(transacao.id) ?? []}
            empresa={nomeEmpresa(transacao.empresa_id)}
            onRemover={onRemover}
          />
        ))
      )}
    </View>
  );
}
