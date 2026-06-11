# Thaura Finanças — Controle financeiro

Aplicativo web financeiro com 6 módulos, baseado nas planilhas CUSTOS.xlsx,
PRECIFICAÇÃO.xlsx e CONTROLE DIARIO.xlsx.

## Como usar

```bash
npm install   # apenas na primeira vez
npm run dev   # abre em http://localhost:5173
```

Para gerar a versão final (pasta `dist/`): `npm run build`.

## Módulos

- **Dashboard** — cards de resumo, gráfico Faturamento × Custos (6 meses),
  pizza de distribuição de custos, indicadores estratégicos e alertas automáticos.
- **DRE — Resultado** — demonstrativo mensal com percentuais sobre o faturamento.
- **Custos do Negócio** — custos fixos, variáveis e anuais (÷12) da Thaura,
  com botão "Copiar do mês anterior".
- **Gastos Pessoais** — os 35 itens da planilha pessoal, com total automático.
- **Precificação** — custo por hora, valor mínimo por sessão e tabela de preços
  com custo, margem e lucro de cada serviço.
- **Planejamento 2026** — metas × realizado acumulado, com barras de progresso.

## Dados

- Salvos automaticamente (debounce de 800 ms) na chave `financas_app_data`,
  usando o Artifact Storage (`window.storage`) quando disponível e
  `localStorage` do navegador como alternativa. Nada sai do seu computador.
- Cada mês (Janeiro 2024 a Dezembro 2027) tem dados independentes.
- Botão **Exportar dados** baixa um backup em JSON.
- Valores base (aluguel, pró-labore, tabela de preços etc.) já vêm
  pré-carregados em meses ainda não editados.

Todo o código do app está em um único arquivo: `src/App.jsx`.
