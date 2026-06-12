import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Home,
  CircleDollarSign,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Copy,
  Check,
  Loader2,
  Cloud,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  PiggyBank,
  Moon,
  Sun,
  LogOut,
  Camera,
} from "lucide-react";
import logoUrl from "./logo.png";
import emblemaUrl from "./emblema.png";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Dados reais importados das planilhas — o arquivo fica só neste computador,
// fora do repositório público. Na versão publicada ele não existe e o app
// abre vazio (os dados entram pelo botão "Importar dados").
const seedFiles = import.meta.glob("./dadosPlanilha.json", { eager: true });
const SEED = seedFiles["./dadosPlanilha.json"]?.default ?? { months: {} };

/* ============================================================
   CONSTANTES E ESTRUTURA DOS DADOS
   ============================================================ */

const STORAGE_KEY = "financas_app_data";
const LOGIN_KEY = "financas_app_login";
const TEMA_KEY = "financas_app_tema";

// Hash do PIN (nunca guardamos o PIN em si)
async function hashPin(pin, salt) {
  const texto = salt + ":" + pin;
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // ambientes sem crypto.subtle (ex.: http sem https)
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  }
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTO = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const ANOS = [2024, 2025, 2026, 2027];

// Módulo 2 — Custos fixos do negócio
const FIXOS_DEF = [
  { key: "aluguel", label: "Aluguel", def: 1500 },
  { key: "iptu", label: "IPTU", def: 63.05 },
  { key: "marketing", label: "Marketing", def: 600 },
  { key: "internet", label: "Internet", def: 100 },
  { key: "materialAuriculo", label: "Material auriculoterapia", def: 150 },
  { key: "materialMassagem", label: "Material massagem", def: 150 },
  { key: "sistema", label: "Sistema/Aplicativo", def: 25 },
  { key: "crefito", label: "CREFITO", def: 150 },
  { key: "energia", label: "Energia Elétrica", def: 60 },
  { key: "agua", label: "Água (consumo)", def: 100 },
  { key: "datasMkt", label: "Datas comemorativas MKT", def: 300 },
  { key: "estacionamento", label: "Estacionamento", def: 300 },
  { key: "contador", label: "Contador", def: 340 },
  { key: "inss", label: "INSS", def: 183.85 },
  { key: "prolabore", label: "Pró-labore", def: 10000 },
  { key: "faxineira", label: "Faxineira", def: 360 },
  { key: "ferias13", label: "Férias e 13º", def: 1500 },
  { key: "investimentos", label: "Investimentos", def: 350 },
  { key: "reserva", label: "Reserva de emergência", def: 350 },
  { key: "refeicao", label: "Refeição funcionários", def: 400 },
  { key: "mercado", label: "Despesas de mercado", def: 350 },
];

const VARIAVEIS_DEF = [
  { key: "impostoVenda", label: "Imposto sobre venda", def: 900 },
  { key: "taxaCartao", label: "Taxa de cartão", def: 400 },
  { key: "cafeBiscoitos", label: "Café / biscoitos", def: 0 },
  { key: "lembrancinhas", label: "Lembrancinhas", def: 0 },
  { key: "materialLimpeza", label: "Material de limpeza", def: 100 },
  { key: "outrosVariaveis", label: "Outros variáveis", def: 0 },
];

const ANUAIS_DEF = [
  { key: "contadora13", label: "13º Contadora", def: 340 },
  { key: "faxineira13", label: "13º Faxineira", def: 360 },
  { key: "certificadoDigital", label: "Certificado digital", def: 215 },
];

// Módulo 3 — Gastos pessoais
const PESSOAIS_DEF = [
  "CPFL", "Naturgy", "Netflix", "Disney", "Internet", "Faxina", "Tim",
  "Combustível", "Cartão MEI", "Cartão Mãe", "Cartão Xuxu", "Cartão Havan",
  "Outros cartões", "Restaurantes", "Roupas Thaysa", "Ana Boucles", "Viagem",
  "Chácara Natal", "Mercado", "Pós-graduação", "Custos variáveis",
  "Noite das meninas", "Anderson-edi", "Thais ateliê", "Roupas Thales",
  "Manicure", "Farmácia", "Psicóloga mãe", "Uber", "Cílios/Sobrancelha",
  "Transferências marido", "Massagem/Lipo", "Dentista",
  "Idas para São Paulo", "Outros",
].map((label, i) => ({ key: "p" + i, label, def: 0 }));

// Módulo 1 — DRE (campos de entrada)
const DRE_INPUTS = [
  "faturamento", "cmv", "despesaVariavel",
  "infraestrutura", "folhaPagamento", "proLabore",
  "emprestimoJuros", "investimentosEmpresa",
];

// Módulo 4 — Tabela de preços
const PRECOS_DEF = [
  { key: "avaliacao", label: "Avaliação", preco: 250, sessoes: 1 },
  { key: "avulsa", label: "Sessão avulsa", preco: 220, sessoes: 1 },
  { key: "planoMensal", label: "Plano mensal (4 sessões)", preco: 820, sessoes: 4 },
  { key: "planoBimestral", label: "Plano bimestral (8 sessões)", preco: 1560, sessoes: 8 },
  { key: "planoTrimestral", label: "Plano trimestral (12 sessões)", preco: 2220, sessoes: 12 },
  { key: "contratoLiga", label: "Contrato Liga", preco: 3200, sessoes: 16 },
  { key: "consultorias", label: "Consultorias", preco: 1600, sessoes: 2 },
];

// Módulo 6 — Planejamento 2026 (metas editáveis)
const META_INPUTS = [
  { key: "faturamento", label: "Faturamento" },
  { key: "cmv", label: "Custo variável (CMV)" },
  { key: "despesaVariavel", label: "Despesa variável" },
  { key: "despesaFixa", label: "Despesa fixa" },
  { key: "despesasFinanceiras", label: "Despesas financeiras" },
];

/* ============================================================
   ARMAZENAMENTO (Artifact Storage com fallback p/ localStorage)
   ============================================================ */

async function storageGet(key) {
  try {
    const s = typeof window !== "undefined" ? window.storage : null;
    if (s) {
      if (typeof s.getItem === "function") {
        const r = await s.getItem(key);
        if (r == null) return null;
        return typeof r === "string" ? r : r.value ?? null;
      }
      if (typeof s.get === "function") {
        const r = await s.get(key);
        if (r == null) return null;
        return typeof r === "string" ? r : r.value ?? null;
      }
    }
  } catch {
    /* cai para localStorage */
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function storageSet(key, value) {
  try {
    const s = typeof window !== "undefined" ? window.storage : null;
    if (s) {
      if (typeof s.setItem === "function") {
        await s.setItem(key, value);
        return true;
      }
      if (typeof s.set === "function") {
        await s.set(key, value);
        return true;
      }
    }
  } catch {
    /* cai para localStorage */
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================
   FORMATAÇÃO E PARSE
   ============================================================ */

const nfBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const nfNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBRL = (v) => nfBRL.format(Number.isFinite(v) ? v : 0);
const fmtNum = (v) => nfNum.format(Number.isFinite(v) ? v : 0);
const fmtPct = (v) => (Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "—");

function parseBR(text) {
  const t = String(text).trim();
  if (t === "") return 0;
  let s = t.replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* ============================================================
   ESTRUTURA PADRÃO DE UM MÊS
   ============================================================ */

const zerosFrom = (defs) => Object.fromEntries(defs.map((d) => [d.key, 0]));

// Conta nova começa 100% zerada — os dados existentes entram apenas pelo
// arquivo local (dadosPlanilha.json) ou pelo botão "Importar dados".
function defaultMonth() {
  return {
    dre: Object.fromEntries(DRE_INPUTS.map((k) => [k, 0])),
    fixos: zerosFrom(FIXOS_DEF),
    variaveis: zerosFrom(VARIAVEIS_DEF),
    anuais: zerosFrom(ANUAIS_DEF),
    pessoais: zerosFrom(PESSOAIS_DEF),
    prec: {
      horas: 0,
      prolaboreHora: 0,
      itens: Object.fromEntries(
        PRECOS_DEF.map((p) => [p.key, { preco: 0, sessoes: p.sessoes }])
      ),
    },
  };
}

function mergeMonth(saved) {
  const d = defaultMonth();
  if (!saved) return d;
  return {
    dre: { ...d.dre, ...(saved.dre || {}) },
    fixos: { ...d.fixos, ...(saved.fixos || {}) },
    variaveis: { ...d.variaveis, ...(saved.variaveis || {}) },
    anuais: { ...d.anuais, ...(saved.anuais || {}) },
    pessoais: { ...d.pessoais, ...(saved.pessoais || {}) },
    prec: {
      ...d.prec,
      ...(saved.prec || {}),
      itens: { ...d.prec.itens, ...((saved.prec && saved.prec.itens) || {}) },
    },
  };
}

/* ============================================================
   CÁLCULOS
   ============================================================ */

const sum = (obj) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);

function calcCustos(m) {
  const subtotalFixo = sum(m.fixos);
  const subtotalVariavel = sum(m.variaveis);
  const subtotalAnualMensal = sum(m.anuais) / 12;
  return {
    subtotalFixo,
    subtotalVariavel,
    subtotalAnualMensal,
    totalGeral: subtotalFixo + subtotalVariavel + subtotalAnualMensal,
  };
}

function calcDre(m) {
  const d = m.dre;
  const faturamento = d.faturamento || 0;
  const cmv = d.cmv || 0;
  const despesaVariavel = d.despesaVariavel || 0;
  const margemContribuicao = faturamento - cmv - despesaVariavel;
  const despesaFixa = (d.infraestrutura || 0) + (d.folhaPagamento || 0) + (d.proLabore || 0);
  const resultado = margemContribuicao - despesaFixa;
  const despesasFinanceiras = (d.emprestimoJuros || 0) + (d.investimentosEmpresa || 0);
  const lucroLiquido = resultado - despesasFinanceiras;
  const mcPct = faturamento > 0 ? margemContribuicao / faturamento : 0;
  const pontoEquilibrio = mcPct > 0 ? despesaFixa / mcPct : null;
  const pct = (v) => (faturamento > 0 ? (v / faturamento) * 100 : null);
  return {
    faturamento, cmv, despesaVariavel, margemContribuicao, despesaFixa,
    resultado, despesasFinanceiras, lucroLiquido, mcPct, pontoEquilibrio, pct,
  };
}

/* ============================================================
   COMPONENTES BÁSICOS
   ============================================================ */

function CurrencyField({ value, onChange, className = "", placeholder = "0,00" }) {
  // text === null → exibe o valor formatado; text !== null → usuário editando
  const [text, setText] = useState(null);
  const display = text !== null ? text : value ? fmtNum(value) : "";
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onFocus={() => {
        setText(value ? String(value).replace(".", ",") : "");
      }}
      onChange={(e) => {
        const t = e.target.value;
        if (/^[\d.,\sR$]*$/.test(t)) setText(t);
      }}
      onBlur={(e) => {
        setText(null);
        const n = parseBR(e.target.value);
        if (n === null) return; // valor inválido: mantém o anterior
        onChange(Math.max(0, n));
      }}
      className={
        "w-28 sm:w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm " +
        "text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 " +
        "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 " +
        "dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40 " +
        className
      }
    />
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5 " +
        className
      }
    >
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "default" }) {
  const tones = {
    default: "text-slate-800 dark:text-slate-100",
    good: "text-emerald-600",
    bad: "text-red-600",
    warn: "text-amber-600",
  };
  return (
    <Card className="flex items-start gap-2.5 !p-3 sm:gap-3 sm:!p-5">
      <div className="hidden rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 sm:block">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
          {label}
        </p>
        <p className={"mt-0.5 break-words text-base font-semibold leading-tight sm:text-xl " + tones[tone]}>
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </Card>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{children}</h2>
      {right}
    </div>
  );
}

function TotalRow({ label, value, strong = false }) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-xl px-3 py-2 " +
        (strong
          ? "bg-emerald-600 text-white"
          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")
      }
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm font-bold tabular-nums">{fmtBRL(value)}</span>
    </div>
  );
}

function ItemTable({ defs, values, onChange }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {defs.map((d) => (
        <div key={d.key} className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-sm text-slate-600 dark:text-slate-300">{d.label}</span>
          <CurrencyField value={values[d.key] || 0} onChange={(v) => onChange(d.key, v)} />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   MÓDULO 1 — DRE
   ============================================================ */

function DreLine({ prefix, label, value, pct, input, bold = false, indent = false, tone }) {
  const toneCls =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "bad"
      ? "text-red-600 dark:text-red-400"
      : "text-slate-800 dark:text-slate-100";
  return (
    <div
      className={
        "grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 py-2 " +
        (indent ? "pl-6" : "")
      }
    >
      <span className="w-6 text-xs font-semibold text-slate-400">{prefix}</span>
      <span
        className={
          "text-sm " +
          (bold
            ? "font-semibold text-slate-800 dark:text-slate-100"
            : "text-slate-600 dark:text-slate-300")
        }
      >
        {label}
      </span>
      {input ? (
        input
      ) : (
        <span className={"w-28 text-right text-sm font-semibold tabular-nums sm:w-32 " + toneCls}>
          {fmtBRL(value)}
        </span>
      )}
      <span className="w-14 text-right text-xs tabular-nums text-slate-400">
        {pct === null || pct === undefined ? "—" : fmtPct(pct)}
      </span>
    </div>
  );
}

function ModuloDre({ month, setDre, custos }) {
  const r = calcDre(month);
  const inp = (key) => (
    <CurrencyField value={month.dre[key] || 0} onChange={(v) => setDre(key, v)} />
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Faturamento" value={fmtBRL(r.faturamento)} />
        <StatCard
          icon={Percent}
          label="Margem de contribuição"
          value={r.faturamento > 0 ? fmtPct(r.mcPct * 100) : "—"}
          sub={fmtBRL(r.margemContribuicao)}
        />
        <StatCard
          icon={PiggyBank}
          label="Lucro líquido"
          value={fmtBRL(r.lucroLiquido)}
          tone={r.lucroLiquido > 0 ? "good" : r.lucroLiquido < 0 ? "bad" : "default"}
        />
        <StatCard
          icon={Target}
          label="Ponto de equilíbrio"
          value={r.pontoEquilibrio !== null ? fmtBRL(r.pontoEquilibrio) : "—"}
          sub="Faturamento mínimo do mês"
        />
      </div>

      <Card>
        <SectionTitle
          right={
            <span className="text-xs text-slate-400">
              Custos do negócio neste mês: <b className="text-slate-600">{fmtBRL(custos.totalGeral)}</b>
            </span>
          }
        >
          DRE — Resultado mensal
        </SectionTitle>
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 border-b border-slate-100 pb-1 text-xs font-semibold uppercase text-slate-400 dark:border-slate-800">
          <span className="w-6" />
          <span>Descrição</span>
          <span className="w-28 text-right sm:w-32">R$</span>
          <span className="w-14 text-right">%</span>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          <DreLine label="FATURAMENTO" bold input={inp("faturamento")} pct={r.faturamento > 0 ? 100 : null} />
          <DreLine prefix="(-)" label="CUSTO VARIÁVEL (CMV)" input={inp("cmv")} pct={r.pct(r.cmv)} />
          <DreLine prefix="(-)" label="DESPESA VARIÁVEL" input={inp("despesaVariavel")} pct={r.pct(r.despesaVariavel)} />
          <DreLine prefix="(=)" label="MARGEM DE CONTRIBUIÇÃO" bold value={r.margemContribuicao} pct={r.pct(r.margemContribuicao)} tone={r.margemContribuicao >= 0 ? "good" : "bad"} />
          <DreLine prefix="(-)" label="DESPESA FIXA" bold value={r.despesaFixa} pct={r.pct(r.despesaFixa)} />
          <DreLine indent label="Infraestrutura" input={inp("infraestrutura")} pct={r.pct(month.dre.infraestrutura || 0)} />
          <DreLine indent label="Folha de pagamento" input={inp("folhaPagamento")} pct={r.pct(month.dre.folhaPagamento || 0)} />
          <DreLine indent label="Pró-labore" input={inp("proLabore")} pct={r.pct(month.dre.proLabore || 0)} />
          <DreLine prefix="(=)" label="RESULTADO (L/P)" bold value={r.resultado} pct={r.pct(r.resultado)} tone={r.resultado >= 0 ? "good" : "bad"} />
          <DreLine prefix="(-)" label="DESPESAS FINANCEIRAS" bold value={r.despesasFinanceiras} pct={r.pct(r.despesasFinanceiras)} />
          <DreLine indent label="Empréstimo / Juros" input={inp("emprestimoJuros")} pct={r.pct(month.dre.emprestimoJuros || 0)} />
          <DreLine indent label="Investimentos na empresa" input={inp("investimentosEmpresa")} pct={r.pct(month.dre.investimentosEmpresa || 0)} />
          <DreLine prefix="(=)" label="LUCRO LÍQUIDO" bold value={r.lucroLiquido} pct={r.pct(r.lucroLiquido)} tone={r.lucroLiquido >= 0 ? "good" : "bad"} />
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   MÓDULO 2 — CUSTOS DO NEGÓCIO
   ============================================================ */

function ModuloCustos({ month, setField, onCopyPrev }) {
  const c = calcCustos(month);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Custos do negócio — Thayfinance</p>
        <button
          onClick={onCopyPrev}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
        >
          <Copy size={15} /> Copiar do mês anterior
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Custos fixos</SectionTitle>
          <ItemTable defs={FIXOS_DEF} values={month.fixos} onChange={(k, v) => setField("fixos", k, v)} />
          <div className="mt-3">
            <TotalRow label="Subtotal FIXO" value={c.subtotalFixo} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Custos variáveis</SectionTitle>
            <ItemTable defs={VARIAVEIS_DEF} values={month.variaveis} onChange={(k, v) => setField("variaveis", k, v)} />
            <div className="mt-3">
              <TotalRow label="Subtotal VARIÁVEL" value={c.subtotalVariavel} />
            </div>
          </Card>

          <Card>
            <SectionTitle>Custos anuais (valor anual ÷ 12)</SectionTitle>
            <ItemTable defs={ANUAIS_DEF} values={month.anuais} onChange={(k, v) => setField("anuais", k, v)} />
            <div className="mt-3">
              <TotalRow label="Subtotal ANUAL MENSAL" value={c.subtotalAnualMensal} />
            </div>
          </Card>

          <TotalRow label="TOTAL GERAL DE CUSTOS" value={c.totalGeral} strong />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MÓDULO 3 — GASTOS PESSOAIS
   ============================================================ */

function ModuloPessoais({ month, setField }) {
  const total = sum(month.pessoais);
  const half = Math.ceil(PESSOAIS_DEF.length / 2);
  const cols = [PESSOAIS_DEF.slice(0, half), PESSOAIS_DEF.slice(half)];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {cols.map((defs, i) => (
          <Card key={i}>
            <ItemTable defs={defs} values={month.pessoais} onChange={(k, v) => setField("pessoais", k, v)} />
          </Card>
        ))}
      </div>
      <TotalRow label="TOTAL PESSOAL" value={total} strong />
    </div>
  );
}

/* ============================================================
   MÓDULO 4 — PRECIFICAÇÃO
   ============================================================ */

function ModuloPrecificacao({ month, setPrec, setPrecItem }) {
  const c = calcCustos(month);
  const prec = month.prec;
  const horas = prec.horas || 0;
  // Custo da hora trabalhada: custos do negócio (sem o pró-labore, que entra à parte) ÷ horas
  const custoBase = Math.max(0, c.totalGeral - (month.fixos.prolabore || 0));
  const custoHora = horas > 0 ? custoBase / horas : 0;
  const valorMinimo = custoHora + (prec.prolaboreHora || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Custo fixo mensal" value={fmtBRL(c.totalGeral)} sub="Total do módulo Custos" />
        <StatCard icon={CircleDollarSign} label="Custo por hora" value={fmtBRL(custoHora)} sub="Sem pró-labore" />
        <StatCard icon={TrendingUp} label="Pró-labore / hora" value={fmtBRL(prec.prolaboreHora || 0)} />
        <StatCard icon={Target} label="Valor mínimo / sessão" value={fmtBRL(valorMinimo)} tone="good" />
      </div>

      <Card>
        <SectionTitle>Parâmetros da calculadora</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Horas trabalhadas por mês
            </label>
            <CurrencyField value={horas} onChange={(v) => setPrec("horas", v)} className="!w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Pró-labore desejado por hora (R$)
            </label>
            <CurrencyField
              value={prec.prolaboreHora || 0}
              onChange={(v) => setPrec("prolaboreHora", v)}
              className="!w-full"
            />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 text-xs text-slate-500">
            <b className="text-slate-700 dark:text-slate-200">Como calculamos:</b> custo por hora = (total de custos −
            pró-labore) ÷ horas. Valor mínimo = custo por hora + pró-labore desejado.
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Tabela de preços</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-400 dark:border-slate-800">
                <th className="py-2 pr-2">Serviço</th>
                <th className="py-2 pr-2 text-right">Sessões</th>
                <th className="py-2 pr-2 text-right">Preço atual</th>
                <th className="py-2 pr-2 text-right">Custo</th>
                <th className="py-2 pr-2 text-right">Margem contrib.</th>
                <th className="py-2 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {PRECOS_DEF.map((p) => {
                const it = prec.itens[p.key] || { preco: 0, sessoes: 1 };
                const custo = custoHora * (it.sessoes || 0);
                const margem = (it.preco || 0) - custo;
                const lucro = (it.preco || 0) - valorMinimo * (it.sessoes || 0);
                const margemPct = it.preco > 0 ? (margem / it.preco) * 100 : null;
                return (
                  <tr key={p.key}>
                    <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{p.label}</td>
                    <td className="py-2 pr-2 text-right">
                      <CurrencyField
                        value={it.sessoes || 0}
                        onChange={(v) => setPrecItem(p.key, "sessoes", v)}
                        className="!w-16"
                        placeholder="1"
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <CurrencyField
                        value={it.preco || 0}
                        onChange={(v) => setPrecItem(p.key, "preco", v)}
                        className="!w-24"
                      />
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{fmtBRL(custo)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                      {fmtBRL(margem)}
                      <span className="ml-1 text-xs text-slate-400">
                        {margemPct !== null ? `(${fmtPct(margemPct)})` : ""}
                      </span>
                    </td>
                    <td
                      className={
                        "py-2 text-right font-semibold tabular-nums " +
                        (lucro >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {fmtBRL(lucro)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Custo = custo por hora × sessões · Lucro = preço − (valor mínimo × sessões), já considerando
          o pró-labore desejado.
        </p>
      </Card>
    </div>
  );
}

/* ============================================================
   MÓDULO 5 — DASHBOARD
   ============================================================ */

const PIE_COLORS = ["#10b981", "#6ee7b7", "#94a3b8"];

function ModuloDashboard({ data, year, monthIdx, escuro }) {
  const key = monthKey(year, monthIdx);
  const m = mergeMonth(data.months[key]);
  const dre = calcDre(m);
  const custos = calcCustos(m);
  const pessoal = sum(m.pessoais);
  const custosTotaisDre = dre.cmv + dre.despesaVariavel + dre.despesaFixa + dre.despesasFinanceiras;
  const custosTotais = custosTotaisDre > 0 ? custosTotaisDre : custos.totalGeral;

  const barData = [];
  for (let i = 5; i >= 0; i--) {
    let mi = monthIdx - i;
    let y = year;
    while (mi < 0) {
      mi += 12;
      y -= 1;
    }
    const mm = mergeMonth(data.months[monthKey(y, mi)]);
    const d = calcDre(mm);
    const ct = d.cmv + d.despesaVariavel + d.despesaFixa + d.despesasFinanceiras;
    barData.push({
      name: MESES_CURTO[mi] + (y !== year ? "/" + String(y).slice(2) : ""),
      Faturamento: d.faturamento,
      Custos: ct > 0 ? ct : calcCustos(mm).totalGeral,
    });
  }

  const pieData = [
    { name: "Custos fixos", value: custos.subtotalFixo + custos.subtotalAnualMensal },
    { name: "Custos variáveis", value: custos.subtotalVariavel },
    { name: "Gastos pessoais", value: pessoal },
  ].filter((d) => d.value > 0);

  const lucratividade = dre.faturamento > 0 ? (dre.lucroLiquido / dre.faturamento) * 100 : null;
  const investTotal = (m.dre.investimentosEmpresa || 0) + (m.fixos.investimentos || 0);
  const rentabilidade = investTotal > 0 ? (dre.lucroLiquido / investTotal) * 100 : null;
  const comprometimento = dre.faturamento > 0 ? (pessoal / dre.faturamento) * 100 : null;

  const alertaPessoal = comprometimento !== null && comprometimento > 50;
  const alertaLucro = dre.lucroLiquido < 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Total faturado" value={fmtBRL(dre.faturamento)} />
        <StatCard icon={Wallet} label="Total de custos" value={fmtBRL(custosTotais)} />
        <StatCard
          icon={PiggyBank}
          label="Lucro líquido"
          value={fmtBRL(dre.lucroLiquido)}
          tone={dre.lucroLiquido > 0 ? "good" : dre.lucroLiquido < 0 ? "bad" : "default"}
        />
        <StatCard
          icon={Percent}
          label="Margem %"
          value={dre.faturamento > 0 ? fmtPct(dre.mcPct * 100) : "—"}
          sub="Margem de contribuição"
        />
      </div>

      {(alertaLucro || alertaPessoal) && (
        <div className="space-y-2">
          {alertaLucro && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <b>Lucro líquido negativo neste mês.</b> Revise as despesas fixas e o pró-labore, e
                confira se os preços cobrem o custo por sessão (módulo Precificação). Reduzir custos
                variáveis ou renegociar o aluguel são bons primeiros passos.
              </div>
            </div>
          )}
          {alertaPessoal && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <b>Gastos pessoais acima de 50% do faturamento</b> (
                {fmtPct(comprometimento)}). Vale revisar os itens de maior peso no módulo Gastos
                Pessoais.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Faturamento × Custos (últimos 6 meses)</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={escuro ? "#1e293b" : "#f1f5f9"} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? (v / 1000).toLocaleString("pt-BR") + "k" : v)} />
                <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Faturamento" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Custos" fill={escuro ? "#475569" : "#cbd5e1"} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle>Distribuição dos custos do mês</SectionTitle>
          <div className="h-64">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Sem custos lançados neste mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Indicadores estratégicos</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Ponto de equilíbrio",
              value: dre.pontoEquilibrio !== null ? fmtBRL(dre.pontoEquilibrio) : "—",
              sub: "Despesa fixa ÷ MC%",
              icon: Target,
            },
            {
              label: "Lucratividade",
              value: lucratividade !== null ? fmtPct(lucratividade) : "—",
              sub: "Lucro ÷ Faturamento",
              icon: lucratividade !== null && lucratividade < 0 ? TrendingDown : TrendingUp,
            },
            {
              label: "Rentabilidade",
              value: rentabilidade !== null ? fmtPct(rentabilidade) : "—",
              sub: "Lucro ÷ Investimento",
              icon: PiggyBank,
            },
            {
              label: "Comprometimento pessoal",
              value: comprometimento !== null ? fmtPct(comprometimento) : "—",
              sub: "Pessoal ÷ Faturamento",
              icon: Home,
            },
          ].map((ind) => (
            <div key={ind.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-slate-500">
                <ind.icon size={15} />
                <span className="text-xs font-medium">{ind.label}</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{ind.value}</p>
              <p className="text-xs text-slate-400">{ind.sub}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   MÓDULO 6 — PLANEJAMENTO 2026
   ============================================================ */

function ModuloPlanejamento({ data, setMeta }) {
  const metas = data.metas2026 || {};

  // Realizado acumulado de 2026 (meses lançados)
  const realizado = {
    faturamento: 0, cmv: 0, despesaVariavel: 0, margemContribuicao: 0,
    despesaFixa: 0, resultado: 0, despesasFinanceiras: 0, lucroLiquido: 0,
  };
  Object.keys(data.months)
    .filter((k) => k.startsWith("2026-"))
    .forEach((k) => {
      const d = calcDre(mergeMonth(data.months[k]));
      realizado.faturamento += d.faturamento;
      realizado.cmv += d.cmv;
      realizado.despesaVariavel += d.despesaVariavel;
      realizado.margemContribuicao += d.margemContribuicao;
      realizado.despesaFixa += d.despesaFixa;
      realizado.resultado += d.resultado;
      realizado.despesasFinanceiras += d.despesasFinanceiras;
      realizado.lucroLiquido += d.lucroLiquido;
    });

  const metaCalc = {
    faturamento: metas.faturamento || 0,
    cmv: metas.cmv || 0,
    despesaVariavel: metas.despesaVariavel || 0,
    margemContribuicao: (metas.faturamento || 0) - (metas.cmv || 0) - (metas.despesaVariavel || 0),
    despesaFixa: metas.despesaFixa || 0,
    resultado: 0,
    despesasFinanceiras: metas.despesasFinanceiras || 0,
    lucroLiquido: 0,
  };
  metaCalc.resultado = metaCalc.margemContribuicao - metaCalc.despesaFixa;
  metaCalc.lucroLiquido = metaCalc.resultado - metaCalc.despesasFinanceiras;

  const rows = [
    { key: "faturamento", label: "Faturamento", input: true },
    { key: "cmv", label: "Custo variável (CMV)", input: true, inverse: true },
    { key: "despesaVariavel", label: "Despesa variável", input: true, inverse: true },
    { key: "margemContribuicao", label: "Margem de contribuição" },
    { key: "despesaFixa", label: "Despesa fixa", input: true, inverse: true },
    { key: "resultado", label: "Resultado (L/P)" },
    { key: "despesasFinanceiras", label: "Despesas financeiras", input: true, inverse: true },
    { key: "lucroLiquido", label: "Lucro líquido" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Planejamento 2026 — Meta × Realizado</SectionTitle>
        <div className="space-y-4">
          {rows.map((row) => {
            const meta = metaCalc[row.key];
            const real = realizado[row.key];
            const pct = meta !== 0 ? (real / meta) * 100 : null;
            const progress = pct !== null ? Math.max(0, Math.min(100, pct)) : 0;
            const onTrack = row.inverse ? pct !== null && pct <= 100 : pct !== null && pct >= 100;
            return (
              <div key={row.key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{row.label}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Meta 2026</p>
                      {row.input ? (
                        <CurrencyField
                          value={metas[row.key] || 0}
                          onChange={(v) => setMeta(row.key, v)}
                          className="!w-28"
                        />
                      ) : (
                        <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtBRL(meta)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Realizado</p>
                      <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtBRL(real)}</p>
                    </div>
                    <div className="w-16 text-right">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Variação</p>
                      <p
                        className={
                          "text-sm font-semibold tabular-nums " +
                          (pct === null ? "text-slate-400" : onTrack ? "text-emerald-600" : "text-amber-600")
                        }
                      >
                        {pct === null ? "—" : fmtPct(pct)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={
                      "h-full rounded-full transition-all " +
                      (row.inverse
                        ? progress > 100 || (pct !== null && pct > 100)
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                        : "bg-emerald-500")
                    }
                    style={{ width: progress + "%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          O "Realizado" soma automaticamente os meses de 2026 já lançados no DRE. Margem, resultado e
          lucro da meta são calculados a partir dos demais campos.
        </p>
      </Card>
    </div>
  );
}

/* ============================================================
   TELA DE LOGIN (primeiro uso + bloqueio opcional por PIN)
   ============================================================ */

// Lê uma imagem, recorta no quadrado central e reduz para 256px (JPEG leve)
function lerFoto(file, cb) {
  if (!file) return cb(null);
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    try {
      const n = 256;
      const canvas = document.createElement("canvas");
      canvas.width = n;
      canvas.height = n;
      const ctx = canvas.getContext("2d");
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, n, n);
      cb(canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      cb(null);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    cb(null);
  };
  img.src = url;
}

function CampoLogin({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
      />
    </div>
  );
}

function TelaLogin({ modo, nome, foto, onCriar, onDesbloquear, onEsqueci, escuro, onTema }) {
  const [nomeInput, setNomeInput] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pedirSempre, setPedirSempre] = useState(true);
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [fotoNova, setFotoNova] = useState(null);
  const fotoRef = useRef(null);

  const pinValido = (p) => /^\d{4,6}$/.test(p);

  async function criar(e) {
    e.preventDefault();
    if (!nomeInput.trim()) return setErro("Digite como você quer ser chamada.");
    if (!pinValido(pin)) return setErro("O PIN precisa ter de 4 a 6 números.");
    if (pin !== pin2) return setErro("Os dois PINs não são iguais. Tente de novo.");
    setErro("");
    await onCriar(nomeInput.trim(), pin, pedirSempre, fotoNova);
  }

  async function desbloquear(e) {
    e.preventDefault();
    if (!pinValido(pin)) return setErro("Digite o PIN (4 a 6 números).");
    setVerificando(true);
    const ok = await onDesbloquear(pin);
    setVerificando(false);
    if (!ok) {
      setPin("");
      setErro("PIN incorreto. Tente de novo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <button
        onClick={onTema}
        aria-label="Alternar modo claro/escuro"
        className="fixed right-4 top-4 rounded-full border border-slate-200 bg-white p-2.5 text-slate-400 transition hover:text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-300"
      >
        {escuro ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center text-center">
          {modo === "lock" && foto ? (
            <img
              src={foto}
              alt=""
              className="mb-3 h-20 w-20 rounded-full border-2 border-emerald-500 object-cover"
            />
          ) : modo === "lock" ? (
            <img src={emblemaUrl} alt="" className="mb-3 h-20 w-20 object-contain" />
          ) : (
            <div className="mb-2 rounded-2xl bg-white px-4 py-2">
              <img src={logoUrl} alt="" className="h-28 object-contain" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {modo === "lock" ? `Olá, ${nome}!` : "Bem-vinda ao Thayfinance"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {modo === "lock"
              ? "Digite seu PIN para entrar"
              : "Vamos preparar seu app em 10 segundos"}
          </p>
        </div>

        {modo === "setup" ? (
          <form onSubmit={criar} className="space-y-4">
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                lerFoto(e.target.files?.[0], (f) => f && setFotoNova(f));
                e.target.value = "";
              }}
            />
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => fotoRef.current?.click()}
                aria-label="Escolher foto"
                className="transition hover:opacity-80"
              >
                {fotoNova ? (
                  <img
                    src={fotoNova}
                    alt=""
                    className="h-20 w-20 rounded-full border-2 border-emerald-500 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-600">
                    <Camera size={24} />
                  </div>
                )}
              </button>
              <span className="text-xs text-slate-400">
                Foto (opcional) — toque para escolher
              </span>
            </div>
            <CampoLogin
              label="Como você quer ser chamada?"
              type="text"
              value={nomeInput}
              onChange={(e) => setNomeInput(e.target.value)}
              placeholder="Seu nome"
              autoFocus
            />
            <CampoLogin
              label="Crie um PIN (4 a 6 números)"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
            <CampoLogin
              label="Repita o PIN"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={pedirSempre}
                onChange={(e) => setPedirSempre(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Pedir o PIN sempre que o app abrir
            </label>
            {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Começar
            </button>
            <p className="text-center text-xs text-slate-400">
              O PIN fica guardado só neste aparelho.
            </p>
          </form>
        ) : (
          <form onSubmit={desbloquear} className="space-y-4">
            <CampoLogin
              label="Seu PIN"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
            />
            {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
            <button
              type="submit"
              disabled={verificando}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {verificando ? "Verificando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={onEsqueci}
              className="w-full text-center text-xs text-slate-400 underline-offset-2 hover:underline"
            >
              Esqueci o PIN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */

const monthKey = (year, monthIdx) => `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "dre", label: "DRE — Resultado", icon: BarChart3 },
  { id: "custos", label: "Custos do Negócio", icon: Wallet },
  { id: "pessoais", label: "Gastos Pessoais", icon: Home },
  { id: "precificacao", label: "Precificação", icon: CircleDollarSign },
  { id: "planejamento", label: "Planejamento 2026", icon: CalendarRange },
];

export default function App() {
  const [data, setData] = useState({ months: {}, metas2026: {} });
  const [view, setView] = useState("dashboard");
  const [year, setYear] = useState(2026);
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth());
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [login, setLogin] = useState(null); // {nome, salt, pinHash, pedirSempre}
  const [auth, setAuth] = useState("init"); // init | setup | lock | open
  const [escuro, setEscuro] = useState(
    () => {
      try {
        return localStorage.getItem(TEMA_KEY) === "escuro";
      } catch {
        return false;
      }
    }
  );
  const dirtyRef = useRef(false);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const fotoTrocaRef = useRef(null);

  // Aplica o tema escuro/claro
  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    try {
      localStorage.setItem(TEMA_KEY, escuro ? "escuro" : "claro");
    } catch {
      /* sem armazenamento disponível */
    }
  }, [escuro]);

  // Carrega dados salvos ao abrir
  useEffect(() => {
    (async () => {
      try {
        const rawLogin = await storageGet(LOGIN_KEY);
        const conf = rawLogin ? JSON.parse(rawLogin) : null;
        if (conf && conf.pinHash) {
          setLogin(conf);
          setAuth(conf.pedirSempre ? "lock" : "open");
        } else {
          setAuth("setup");
        }
      } catch {
        setAuth("setup");
      }
      try {
        const raw = await storageGet(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const saved = parsed && typeof parsed === "object" ? parsed : {};
        // Meses importados das planilhas servem de base; o que você
        // salvar no app tem prioridade sobre a planilha.
        setData({
          months: { ...(SEED.months || {}), ...(saved.months || {}) },
          metas2026: saved.metas2026 || {},
        });
      } catch {
        showToast("Não foi possível carregar os dados salvos.", true);
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-salvamento com debounce de 800ms
  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      const ok = await storageSet(STORAGE_KEY, JSON.stringify(data));
      if (ok) {
        setStatus("saved");
        showToast("Salvo ✓");
      } else {
        setStatus("error");
        showToast("Erro ao salvar. Tente novamente.", true);
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loaded]);

  function showToast(msg, isError = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, isError });
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  const key = monthKey(year, monthIdx);
  const month = useMemo(() => mergeMonth(data.months[key]), [data, key]);
  const custos = useMemo(() => calcCustos(month), [month]);

  const commitMonth = useCallback(
    (updater) => {
      dirtyRef.current = true;
      setData((prev) => {
        const current = mergeMonth(prev.months[key]);
        const next = updater(current);
        return { ...prev, months: { ...prev.months, [key]: next } };
      });
    },
    [key]
  );

  const setField = (section, k, v) =>
    commitMonth((m) => ({ ...m, [section]: { ...m[section], [k]: v } }));
  const setDre = (k, v) => setField("dre", k, v);
  const setPrec = (k, v) => commitMonth((m) => ({ ...m, prec: { ...m.prec, [k]: v } }));
  const setPrecItem = (item, k, v) =>
    commitMonth((m) => ({
      ...m,
      prec: {
        ...m.prec,
        itens: { ...m.prec.itens, [item]: { ...m.prec.itens[item], [k]: v } },
      },
    }));
  const setMeta = (k, v) => {
    dirtyRef.current = true;
    setData((prev) => ({ ...prev, metas2026: { ...prev.metas2026, [k]: v } }));
  };

  function copyPrevMonth() {
    let pm = monthIdx - 1;
    let py = year;
    if (pm < 0) {
      pm = 11;
      py -= 1;
    }
    const prevSaved = data.months[monthKey(py, pm)];
    if (!prevSaved) {
      showToast(`Nada lançado em ${MESES[pm]} de ${py}.`, true);
      return;
    }
    if (
      !window.confirm(
        `Copiar os custos de ${MESES[pm]} de ${py} para ${MESES[monthIdx]} de ${year}? Os custos atuais deste mês serão substituídos.`
      )
    )
      return;
    const prev = mergeMonth(prevSaved);
    commitMonth((m) => ({
      ...m,
      fixos: { ...prev.fixos },
      variaveis: { ...prev.variaveis },
      anuais: { ...prev.anuais },
      prec: JSON.parse(JSON.stringify(prev.prec)),
    }));
    showToast("Custos copiados do mês anterior ✓");
  }

  async function criarLogin(nome, pin, pedirSempre, foto) {
    const salt = Math.random().toString(36).slice(2, 12);
    const conf = { nome, salt, pinHash: await hashPin(pin, salt), pedirSempre, foto: foto || null };
    await storageSet(LOGIN_KEY, JSON.stringify(conf));
    setLogin(conf);
    setAuth("open");
    showToast(`Tudo pronto, ${nome}! ✓`);
  }

  async function desbloquear(pin) {
    if (!login) return false;
    const ok = (await hashPin(pin, login.salt)) === login.pinHash;
    if (ok) setAuth("open");
    return ok;
  }

  async function esqueciPin() {
    if (
      !window.confirm(
        "Redefinir o PIN? Seus dados financeiros NÃO serão apagados — você só vai criar um novo PIN."
      )
    )
      return;
    await storageSet(LOGIN_KEY, "");
    setLogin(null);
    setAuth("setup");
  }

  function sair() {
    setAuth("lock");
  }

  function trocarFoto(file) {
    if (!file || !login) return;
    lerFoto(file, async (f) => {
      if (!f) {
        showToast("Não foi possível ler a imagem.", true);
        return;
      }
      const conf = { ...login, foto: f };
      setLogin(conf);
      await storageSet(LOGIN_KEY, JSON.stringify(conf));
      showToast("Foto atualizada ✓");
    });
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object" || !parsed.months) {
          throw new Error("estrutura inválida");
        }
        if (
          !window.confirm(
            "Importar este backup? Os dados atuais deste aparelho serão substituídos pelos do arquivo."
          )
        )
          return;
        dirtyRef.current = true;
        setData({ months: parsed.months || {}, metas2026: parsed.metas2026 || {} });
        showToast("Backup importado ✓");
      } catch {
        showToast("Arquivo inválido. Use um backup exportado pelo próprio app.", true);
      }
    };
    reader.onerror = () => showToast("Não foi possível ler o arquivo.", true);
    reader.readAsText(file);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thayfinance-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado ✓");
  }

  function stepMonth(delta) {
    let mi = monthIdx + delta;
    let y = year;
    if (mi < 0) {
      mi = 11;
      y -= 1;
    } else if (mi > 11) {
      mi = 0;
      y += 1;
    }
    if (!ANOS.includes(y)) return;
    setMonthIdx(mi);
    setYear(y);
  }

  const viewTitle = NAV.find((n) => n.id === view)?.label || "";

  // Nome do app: depois do login vira "{nome}finance" (ex.: Thaysafinance)
  const nomeApp = login?.nome ? `${login.nome.trim().split(/\s+/)[0]}finance` : "Thayfinance";

  useEffect(() => {
    document.title = `${nomeApp} — Controle financeiro`;
  }, [nomeApp]);

  if (auth === "init") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (auth === "setup" || auth === "lock") {
    return (
      <TelaLogin
        modo={auth}
        nome={login?.nome}
        foto={login?.foto}
        onCriar={criarLogin}
        onDesbloquear={desbloquear}
        onEsqueci={esqueciPin}
        escuro={escuro}
        onTema={() => setEscuro((e) => !e)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src={emblemaUrl} alt="" className="h-10 w-10 object-contain" />
          <div>
            <p className="text-base font-bold leading-tight text-slate-800 dark:text-slate-100">{nomeApp}</p>
            <p className="text-xs text-slate-400">Controle financeiro</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                (view === n.id
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200")
              }
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="space-y-2 px-3 pb-5">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
            <button
              onClick={() => fotoTrocaRef.current?.click()}
              aria-label="Trocar foto"
              title="Trocar foto"
              className="shrink-0 transition hover:opacity-80"
            >
              {login?.foto ? (
                <img src={login.foto} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Camera size={15} />
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {login?.nome}
              </p>
              <button
                onClick={() => fotoTrocaRef.current?.click()}
                className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
              >
                Trocar foto
              </button>
            </div>
            <button
              onClick={sair}
              aria-label="Sair"
              title="Sair"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 dark:hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            onClick={exportData}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Download size={16} /> Exportar dados
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Upload size={16} /> Importar dados
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="md:pl-60">
        {/* Header fixo: mês + status */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => fotoTrocaRef.current?.click()}
                aria-label="Trocar foto"
                className="transition hover:opacity-80"
              >
                {login?.foto ? (
                  <img src={login.foto} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <img src={emblemaUrl} alt="" className="h-7 w-7 object-contain" />
                )}
              </button>
              <span className="text-sm font-bold">{nomeApp}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => stepMonth(-1)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <select
                value={monthIdx}
                onChange={(e) => setMonthIdx(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {MESES.map((mn, i) => (
                  <option key={mn} value={i}>
                    {mn}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {ANOS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                onClick={() => stepMonth(1)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEscuro((e) => !e)}
                aria-label="Alternar modo claro/escuro"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                {escuro ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <span
                className={
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium " +
                  (status === "saving"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                    : status === "error"
                    ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                    : status === "saved"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500")
                }
              >
                {status === "saving" ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Salvando...
                  </>
                ) : status === "error" ? (
                  <>
                    <AlertTriangle size={13} /> Erro ao salvar
                  </>
                ) : status === "saved" ? (
                  <>
                    <Check size={13} /> Salvo ✓
                  </>
                ) : (
                  <>
                    <Cloud size={13} /> Pronto
                  </>
                )}
              </span>
              <button
                onClick={exportData}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
                aria-label="Exportar dados"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
                aria-label="Importar dados"
              >
                <Upload size={18} />
              </button>
              <button
                onClick={sair}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 dark:hover:text-red-400 md:hidden"
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10">
          <h1 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            {viewTitle}
            <span className="ml-2 text-sm font-normal text-slate-400">
              {MESES[monthIdx]} de {year}
            </span>
          </h1>

          {!loaded ? (
            <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
              <Loader2 size={18} className="animate-spin" /> Carregando seus dados...
            </div>
          ) : (
            <>
              {view === "dashboard" && (
                <ModuloDashboard data={data} year={year} monthIdx={monthIdx} escuro={escuro} />
              )}
              {view === "dre" && <ModuloDre month={month} setDre={setDre} custos={custos} />}
              {view === "custos" && (
                <ModuloCustos month={month} setField={setField} onCopyPrev={copyPrevMonth} />
              )}
              {view === "pessoais" && <ModuloPessoais month={month} setField={setField} />}
              {view === "precificacao" && (
                <ModuloPrecificacao month={month} setPrec={setPrec} setPrecItem={setPrecItem} />
              )}
              {view === "planejamento" && <ModuloPlanejamento data={data} setMeta={setMeta} />}
            </>
          )}
        </main>
      </div>

      {/* Navegação inferior — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition " +
                (view === n.id ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")
              }
            >
              <n.icon size={19} />
              <span className="truncate px-0.5">{n.label.split(" ")[0].replace("—", "")}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Input oculto para trocar a foto do perfil */}
      <input
        ref={fotoTrocaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          trocarFoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Input oculto para importar backup */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          importData(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className={
            "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg md:bottom-6 " +
            (toast.isError ? "bg-red-500" : "bg-emerald-600")
          }
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
