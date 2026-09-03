/* =========================================================
   RAZÃO — controle financeiro pessoal
   Dados e login no Supabase (nuvem). Veja js/config.js.
   ========================================================= */

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIAS_DESPESA = [
  "Moradia", "Alimentação", "Transporte", "Saúde", "Lazer",
  "Educação", "Assinaturas", "Compras", "Cuidados pessoais",
  "Pagamento de fatura", "Outros"
];
const CATEGORIAS_RECEITA = [
  "Salário", "Freelance", "Rendimentos", "Reembolso", "Outros"
];
const TIPOS_INVESTIMENTO = [
  "Renda fixa", "Tesouro Direto", "Fundos", "Ações", "FIIs", "Cripto", "Reserva de emergência", "Outros"
];
const CORES_CARTAO = ["#33543A", "#8A3B2E", "#1C2430", "#A9822F", "#5B6472"];
const FORMAS_PAGAMENTO = ["Pix", "Débito", "Crédito", "Dinheiro", "Boleto"];

/* ---------- estado ---------- */
let db = { transactions: [], cards: [], investments: [], budgets: [], goals: [] };
let currentUser = null;
let currentView = "visao-geral";
let currentMonth = todayMonth(); // "YYYY-MM"
let authMode = "signin"; // ou "signup"
let chartCategorias = null;
let chartInvestimentos = null;
let chartPlanejado = null;
let chartPagamento = null;

function todayMonth(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function brl(n){
  return (n||0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function fmtDate(iso){
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function monthLabel(ym){
  const [y,m] = ym.split("-").map(Number);
  const d = new Date(y, m-1, 1);
  return d.toLocaleDateString("pt-BR", { month:"long", year:"numeric" });
}
function escapeHtml(str){
  return String(str??"").replace(/[&<>"']/g, s=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

/* =========================================================
   AUTENTICAÇÃO
   ========================================================= */
const authScreen = document.getElementById("auth-screen");
const appEl = document.getElementById("app");
const authForm = document.getElementById("auth-form");
const authError = document.getElementById("auth-error");
const authSubmit = document.getElementById("auth-submit");
const authToggle = document.getElementById("auth-toggle");
const authSub = document.getElementById("auth-sub");

authToggle.addEventListener("click", ()=>{
  authMode = authMode === "signin" ? "signup" : "signin";
  if(authMode === "signup"){
    authSubmit.textContent = "Criar conta";
    authToggle.textContent = "Já tem conta? Entrar";
    authSub.textContent = "Crie sua conta para começar a usar de qualquer aparelho.";
  } else {
    authSubmit.textContent = "Entrar";
    authToggle.textContent = "Ainda não tem conta? Criar conta";
    authSub.textContent = "Entre para acessar seus dados de qualquer aparelho.";
  }
  authError.hidden = true;
});

authForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  authError.hidden = true;
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  authSubmit.disabled = true;
  authSubmit.textContent = authMode === "signup" ? "Criando conta…" : "Entrando…";

  const { data, error } = authMode === "signup"
    ? await sbClient.auth.signUp({ email, password })
    : await sbClient.auth.signInWithPassword({ email, password });

  authSubmit.disabled = false;
  authSubmit.textContent = authMode === "signup" ? "Criar conta" : "Entrar";

  if(error){
    authError.textContent = traduzErro(error.message);
    authError.hidden = false;
    return;
  }
  if(authMode === "signup" && !data.session){
    authError.textContent = "Conta criada. Confira seu e-mail para confirmar o acesso e depois entre.";
    authError.hidden = false;
    authError.style.color = "var(--green)";
    authError.style.background = "var(--green-bg)";
    return;
  }
  // onAuthStateChange cuida do resto
});

function traduzErro(msg){
  if(/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if(/already registered/i.test(msg)) return "Este e-mail já tem conta — tente entrar.";
  if(/password.*(least|short)/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}

document.getElementById("btn-logout").addEventListener("click", async ()=>{
  await sbClient.auth.signOut();
});

sbClient.auth.onAuthStateChange((event, session)=>{
  if(session && session.user){
    currentUser = session.user;
    document.getElementById("user-email").textContent = currentUser.email;
    authScreen.hidden = true;
    appEl.hidden = false;
    boot();
  } else {
    currentUser = null;
    appEl.hidden = true;
    authScreen.hidden = false;
  }
});

/* =========================================================
   CARREGAR DADOS
   ========================================================= */
async function boot(){
  await loadAllData();
  goTo("visao-geral");
}

async function loadAllData(){
  const [tx, cards, invest, budgets, goals] = await Promise.all([
    sbClient.from("transactions").select("*").order("date", { ascending:false }),
    sbClient.from("cards").select("*").order("created_at"),
    sbClient.from("investments").select("*").order("date", { ascending:false }),
    sbClient.from("budgets").select("*").order("created_at"),
    sbClient.from("goals").select("*").order("created_at"),
  ]);
  db.transactions = tx.data || [];
  db.cards = cards.data || [];
  db.investments = invest.data || [];
  db.budgets = budgets.data || [];
  db.goals = goals.data || [];
  const firstErr = [tx, cards, invest, budgets, goals].find(r=>r.error);
  if(firstErr){
    console.error(firstErr.error);
    alert("Não consegui carregar seus dados. Confira se o js/config.js está com a URL e a chave do Supabase corretas, e se rodou o supabase-schema.sql.");
  }
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
const VIEW_META = {
  "visao-geral": ["Visão geral", "Resumo do seu momento financeiro"],
  "transacoes": ["Transações", "Todos os seus lançamentos"],
  "cartoes": ["Cartões", "Limites e faturas por cartão"],
  "investimentos": ["Investimentos", "Onde seu dinheiro está alocado"],
  "orcamento": ["Orçamento", "Metas de gasto por categoria"],
  "metas": ["Metas", "O que você quer alcançar"],
  "backup": ["Backup", "Exportar ou apagar seus dados"],
};

document.querySelectorAll("[data-view]").forEach(el=>{
  el.addEventListener("click", ()=> goTo(el.dataset.view));
});

function goTo(view){
  currentView = view;
  document.querySelectorAll(".view").forEach(v=> v.hidden = true);
  document.getElementById("view-"+view).hidden = false;
  document.querySelectorAll(".nav-item").forEach(b=>{
    b.classList.toggle("is-active", b.dataset.view === view);
  });
  document.getElementById("view-title").textContent = VIEW_META[view][0];
  document.getElementById("view-sub").textContent = VIEW_META[view][1];
  renderAll();
}

document.getElementById("month-prev").addEventListener("click", ()=> shiftMonth(-1));
document.getElementById("month-next").addEventListener("click", ()=> shiftMonth(1));
function shiftMonth(delta){
  const [y,m] = currentMonth.split("-").map(Number);
  const d = new Date(y, m-1+delta, 1);
  currentMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  renderAll();
}

/* =========================================================
   RENDER MASTER
   ========================================================= */
function renderAll(){
  document.getElementById("month-label").textContent = monthLabel(currentMonth);
  populateFilters();
  if(currentView === "visao-geral") renderVisaoGeral();
  if(currentView === "transacoes") renderTransacoes();
  if(currentView === "cartoes") renderCartoes();
  if(currentView === "investimentos") renderInvestimentos();
  if(currentView === "orcamento") renderOrcamento();
  if(currentView === "metas") renderMetas();
}

function transacoesDoMes(mes = currentMonth){
  return db.transactions.filter(t => t.date.startsWith(mes));
}

/* =========================================================
   VISÃO GERAL
   ========================================================= */
function renderVisaoGeral(){
  const txs = transacoesDoMes();
  const receitas = txs.filter(t=>t.type==="receita").reduce((s,t)=>s+Number(t.amount),0);
  const despesas = txs.filter(t=>t.type==="despesa").reduce((s,t)=>s+Number(t.amount),0);
  const totalInvest = db.investments.reduce((s,i)=>s+Number(i.amount),0);

  document.getElementById("stat-saldo").textContent = brl(receitas-despesas);
  document.getElementById("stat-receitas").textContent = brl(receitas);
  document.getElementById("stat-despesas").textContent = brl(despesas);
  document.getElementById("stat-invest").textContent = brl(totalInvest);

  // gráfico por categoria + maior/menor gasto
  const porCategoria = {};
  txs.filter(t=>t.type==="despesa").forEach(t=>{
    porCategoria[t.category] = (porCategoria[t.category]||0) + Number(t.amount);
  });
  const labels = Object.keys(porCategoria);

  const miniStats = document.getElementById("mini-maior-menor");
  if(labels.length){
    const ordenado = labels.slice().sort((a,b)=>porCategoria[b]-porCategoria[a]);
    document.getElementById("stat-maior-gasto").textContent = `${ordenado[0]} — ${brl(porCategoria[ordenado[0]])}`;
    const menor = ordenado[ordenado.length-1];
    document.getElementById("stat-menor-gasto").textContent = `${menor} — ${brl(porCategoria[menor])}`;
    miniStats.hidden = false;
  } else {
    miniStats.hidden = true;
  }

  const canvas = document.getElementById("chart-categorias");
  document.getElementById("chart-categorias-empty").hidden = labels.length>0;
  canvas.hidden = labels.length===0;
  if(chartCategorias) chartCategorias.destroy();
  if(labels.length){
    chartCategorias = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: labels.map(l=>porCategoria[l]),
          backgroundColor: paleta(labels.length),
          borderWidth: 0,
        }]
      },
      options: {
        plugins: { legend: { position:"right", labels:{ boxWidth:10, font:{ family:"Inter", size:11 } } } },
        cutout: "62%",
      }
    });
  }

  // resumo faturas dos cartões
  const wrap = document.getElementById("resumo-cartoes");
  wrap.innerHTML = "";
  document.getElementById("resumo-cartoes-empty").hidden = db.cards.length>0;
  db.cards.forEach(c=>{
    const fatura = txs.filter(t=>t.card_id===c.id && t.type==="despesa").reduce((s,t)=>s+Number(t.amount),0);
    const row = document.createElement("div");
    row.className = "budget-row";
    const pct = c.card_limit ? Math.min(100, (fatura/c.card_limit)*100) : 0;
    row.innerHTML = `
      <div class="budget-row-head"><strong>${escapeHtml(c.name)}</strong><span>${brl(fatura)}</span></div>
      <div class="budget-bar-track"><div class="budget-bar-fill ${pct>=100?'over':''}" style="width:${pct}%;background:${c.color}"></div></div>
      <div class="budget-row-foot"><span>${c.card_limit? 'limite '+brl(c.card_limit) : 'sem limite definido'}</span><span>${c.card_limit? Math.round(pct)+'%':''}</span></div>
    `;
    wrap.appendChild(row);
  });

  // planejado x real (soma dos tetos de orçamento vs gasto real nessas categorias)
  const canvasP = document.getElementById("chart-planejado");
  document.getElementById("chart-planejado-empty").hidden = db.budgets.length>0;
  canvasP.hidden = db.budgets.length===0;
  if(chartPlanejado) chartPlanejado.destroy();
  if(db.budgets.length){
    const totalTeto = db.budgets.reduce((s,b)=>s+Number(b.limit_amount),0);
    const totalReal = db.budgets.reduce((s,b)=> s + (porCategoria[b.category]||0), 0);
    chartPlanejado = new Chart(canvasP, {
      type: "bar",
      data: {
        labels: ["Este mês"],
        datasets: [
          { label: "Teto de gasto", data: [totalTeto], backgroundColor: "#A9C7B0" },
          { label: "Real", data: [totalReal], backgroundColor: "#E7A9C3" },
        ]
      },
      options: {
        plugins: { legend: { position:"bottom", labels:{ font:{ family:"Inter", size:11 } } } },
        scales: { y: { ticks: { callback: (v)=> brl(v) } } }
      }
    });
  }

  // forma de pagamento mais usada
  const porPagamento = {};
  txs.filter(t=>t.type==="despesa").forEach(t=>{
    const key = t.payment_method || "Não informado";
    porPagamento[key] = (porPagamento[key]||0) + Number(t.amount);
  });
  const labelsPg = Object.keys(porPagamento);
  const canvasPg = document.getElementById("chart-pagamento");
  document.getElementById("chart-pagamento-empty").hidden = labelsPg.length>0;
  canvasPg.hidden = labelsPg.length===0;
  if(chartPagamento) chartPagamento.destroy();
  if(labelsPg.length){
    chartPagamento = new Chart(canvasPg, {
      type: "pie",
      data: {
        labels: labelsPg,
        datasets: [{ data: labelsPg.map(l=>porPagamento[l]), backgroundColor: paleta(labelsPg.length), borderWidth: 0 }]
      },
      options: { plugins:{ legend:{ position:"right", labels:{ boxWidth:10, font:{ family:"Inter", size:11 } } } } }
    });
  }

  // últimos lançamentos (globais, não só do mês)
  const recentes = [...db.transactions].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,6);
  const tbody = document.querySelector("#tabela-recentes tbody");
  tbody.innerHTML = "";
  document.getElementById("recentes-empty").hidden = recentes.length>0;
  recentes.forEach(t=> tbody.appendChild(trTransacao(t, false)));
}

function paleta(n){
  const base = ["#33543A","#8A3B2E","#A9822F","#1C2430","#5B6472","#7A9482","#B98C77","#C7B27A","#95A0AC","#4E6B54","#734A3E"];
  const out = [];
  for(let i=0;i<n;i++) out.push(base[i%base.length]);
  return out;
}

/* =========================================================
   TRANSAÇÕES
   ========================================================= */
function populateFilters(){
  const catSel = document.getElementById("filtro-categoria");
  const allCats = [...new Set([...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA])];
  if(catSel.options.length <= 1){
    allCats.forEach(c=>{
      const o = document.createElement("option"); o.value=c; o.textContent=c;
      catSel.appendChild(o);
    });
  }
  const cardSel = document.getElementById("filtro-cartao");
  const prevCard = cardSel.value;
  cardSel.innerHTML = '<option value="">Todos os cartões</option>';
  db.cards.forEach(c=>{
    const o = document.createElement("option"); o.value=c.id; o.textContent=c.name;
    cardSel.appendChild(o);
  });
  cardSel.value = prevCard;

  const pagSel = document.getElementById("filtro-pagamento");
  if(pagSel.options.length <= 1){
    FORMAS_PAGAMENTO.forEach(p=>{
      const o = document.createElement("option"); o.value=p; o.textContent=p;
      pagSel.appendChild(o);
    });
  }
}

["filtro-tipo","filtro-categoria","filtro-cartao","filtro-pagamento"].forEach(id=>{
  document.getElementById(id).addEventListener("change", renderTransacoes);
});

function renderTransacoes(){
  const tipo = document.getElementById("filtro-tipo").value;
  const categoria = document.getElementById("filtro-categoria").value;
  const cartao = document.getElementById("filtro-cartao").value;
  const pagamento = document.getElementById("filtro-pagamento").value;

  let txs = transacoesDoMes();
  if(tipo) txs = txs.filter(t=>t.type===tipo);
  if(categoria) txs = txs.filter(t=>t.category===categoria);
  if(cartao) txs = txs.filter(t=>t.card_id===cartao);
  if(pagamento) txs = txs.filter(t=>t.payment_method===pagamento);
  txs = txs.sort((a,b)=> b.date.localeCompare(a.date));

  const tbody = document.querySelector("#tabela-transacoes tbody");
  tbody.innerHTML = "";
  document.getElementById("transacoes-empty").hidden = txs.length>0;
  txs.forEach(t=> tbody.appendChild(trTransacao(t, true)));
}

function trTransacao(t, withActions){
  const tr = document.createElement("tr");
  let pagamentoTxt = t.payment_method || "—";
  if(t.installment_total) pagamentoTxt += ` (${t.installment_current||1}/${t.installment_total})`;
  if(t.fixed) pagamentoTxt += " · fixa";
  tr.innerHTML = `
    <td>${fmtDate(t.date)}</td>
    <td>${escapeHtml(t.description)}</td>
    <td>${escapeHtml(t.category)}</td>
    ${withActions ? `<td>${escapeHtml(pagamentoTxt)}</td>` : ""}
    <td class="num ${t.type==='receita'?'amount--pos':'amount--neg'}">${t.type==='receita'?'+':'−'} ${brl(t.amount)}</td>
    ${withActions ? `<td class="row-actions"><button data-edit="${t.id}">editar</button><button data-del="${t.id}">excluir</button></td>` : ""}
  `;
  if(withActions){
    tr.querySelector("[data-edit]").addEventListener("click", ()=> openTransacaoModal(t));
    tr.querySelector("[data-del]").addEventListener("click", async ()=>{
      if(confirm("Excluir este lançamento?")){
        const { error } = await sbClient.from("transactions").delete().eq("id", t.id);
        if(error) return alert("Não foi possível excluir: " + error.message);
        db.transactions = db.transactions.filter(x=>x.id!==t.id);
        renderAll();
      }
    });
  }
  return tr;
}

document.getElementById("btn-nova-transacao").addEventListener("click", ()=> openTransacaoModal());

function openTransacaoModal(t){
  const isEdit = !!t;
  const cardOptions = db.cards.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  openModal(isEdit ? "Editar lançamento" : "Novo lançamento", `
    <div class="field-row">
      <div class="field">
        <label>Tipo</label>
        <select name="type" id="f-type">
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>
      <div class="field">
        <label>Data</label>
        <input type="date" name="date" required>
      </div>
    </div>
    <div class="field">
      <label>Descrição</label>
      <input type="text" name="description" placeholder="Ex.: Supermercado" required>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Categoria</label>
        <select name="category" id="f-category"></select>
      </div>
      <div class="field">
        <label>Valor (R$)</label>
        <input type="number" step="0.01" min="0" name="amount" required>
      </div>
    </div>
    <div class="field" id="field-despesa-extra">
      <label>Forma de pagamento</label>
      <select name="payment_method" id="f-payment">
        <option value="">— não informado —</option>
        ${FORMAS_PAGAMENTO.map(p=>`<option value="${p}">${p}</option>`).join("")}
      </select>
    </div>
    <div class="field" id="field-cartao" hidden>
      <label>Cartão</label>
      <select name="card_id">
        <option value="">— selecione —</option>
        ${cardOptions}
      </select>
    </div>
    <div class="field-row" id="field-parcelas" hidden>
      <div class="field">
        <label>Parcela atual</label>
        <input type="number" min="1" name="installment_current">
      </div>
      <div class="field">
        <label>Total de parcelas</label>
        <input type="number" min="1" name="installment_total">
      </div>
    </div>
    <label class="field" id="field-fixa" style="flex-direction:row;align-items:center;gap:8px;">
      <input type="checkbox" name="fixed" style="width:auto;">
      <span>É uma despesa fixa (conta recorrente)</span>
    </label>
  `, async (form)=>{
    const data = Object.fromEntries(new FormData(form));
    const amount = parseFloat(data.amount);
    if(!data.description.trim() || isNaN(amount) || amount<=0) return alert("Preencha descrição e valor corretamente.");
    const payload = {
      type: data.type,
      date: data.date,
      description: data.description.trim(),
      category: data.category,
      amount,
      payment_method: data.payment_method || null,
      card_id: data.payment_method === "Crédito" ? (data.card_id || null) : null,
      installment_current: data.installment_current ? parseInt(data.installment_current) : null,
      installment_total: data.installment_total ? parseInt(data.installment_total) : null,
      fixed: data.type === "despesa" ? !!form.fixed.checked : false,
    };
    if(t){
      const { data: updated, error } = await sbClient.from("transactions").update(payload).eq("id", t.id).select().single();
      if(error) return alert("Não foi possível salvar: " + error.message);
      db.transactions = db.transactions.map(x=> x.id===t.id ? updated : x);
    } else {
      const { data: created, error } = await sbClient.from("transactions").insert(payload).select().single();
      if(error) return alert("Não foi possível salvar: " + error.message);
      db.transactions.push(created);
    }
    closeModal(); renderAll();
  });

  const typeSel = document.getElementById("f-type");
  const catSel = document.getElementById("f-category");
  const paySel = document.getElementById("f-payment");
  const fieldCartao = document.getElementById("field-cartao");
  const fieldParcelas = document.getElementById("field-parcelas");
  const fieldFixa = document.getElementById("field-fixa");

  function refreshCats(){
    const list = typeSel.value==="receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
    catSel.innerHTML = list.map(c=>`<option value="${c}">${c}</option>`).join("");
    if(t) catSel.value = t.category;
    fieldFixa.hidden = typeSel.value !== "despesa";
    document.getElementById("field-despesa-extra").hidden = typeSel.value !== "despesa";
    if(typeSel.value !== "despesa"){ fieldCartao.hidden = true; fieldParcelas.hidden = true; }
    else refreshPagamento();
  }
  function refreshPagamento(){
    const show = paySel.value === "Crédito";
    fieldCartao.hidden = !show;
    fieldParcelas.hidden = !show;
  }
  typeSel.addEventListener("change", refreshCats);
  paySel.addEventListener("change", refreshPagamento);

  if(t){
    document.getElementById("modal-form").date.value = t.date;
    document.getElementById("modal-form").description.value = t.description;
    document.getElementById("modal-form").amount.value = t.amount;
    typeSel.value = t.type;
    paySel.value = t.payment_method || "";
    if(t.card_id) document.getElementById("modal-form").card_id.value = t.card_id;
    if(t.installment_current) document.getElementById("modal-form").installment_current.value = t.installment_current;
    if(t.installment_total) document.getElementById("modal-form").installment_total.value = t.installment_total;
    if(t.fixed) document.getElementById("modal-form").fixed.checked = true;
  } else {
    document.getElementById("modal-form").date.value = new Date().toISOString().slice(0,10);
  }
  refreshCats();
}

/* =========================================================
   CARTÕES
   ========================================================= */
function renderCartoes(){
  const wrap = document.getElementById("lista-cartoes");
  wrap.innerHTML = "";
  document.getElementById("cartoes-empty").hidden = db.cards.length>0;
  const txs = transacoesDoMes();
  db.cards.forEach(c=>{
    const fatura = txs.filter(t=>t.card_id===c.id && t.type==="despesa").reduce((s,t)=>s+Number(t.amount),0);
    const el = document.createElement("div");
    el.className = "credit-card";
    el.style.background = c.color;
    el.innerHTML = `
      <button class="cc-remove" title="Remover cartão">×</button>
      <div class="cc-top">
        <div>
          <div class="cc-name">${escapeHtml(c.name)}</div>
          <div class="cc-brand">${escapeHtml(c.brand||"")}</div>
        </div>
      </div>
      <div>
        <div class="cc-fatura-label">fatura de ${monthLabel(currentMonth)}</div>
        <div class="cc-fatura-valor">${brl(fatura)}</div>
        <div class="cc-limite">${c.card_limit ? 'limite '+brl(c.card_limit) : 'sem limite definido'} · vence dia ${c.due_day||'—'}</div>
      </div>
    `;
    el.querySelector(".cc-remove").addEventListener("click", async ()=>{
      if(confirm(`Remover o cartão "${c.name}"? Lançamentos vinculados a ele não serão apagados.`)){
        const { error } = await sbClient.from("cards").delete().eq("id", c.id);
        if(error) return alert("Não foi possível remover: " + error.message);
        db.cards = db.cards.filter(x=>x.id!==c.id);
        renderAll();
      }
    });
    wrap.appendChild(el);
  });
}

document.getElementById("btn-novo-cartao").addEventListener("click", ()=>{
  openModal("Novo cartão", `
    <div class="field">
      <label>Nome do cartão</label>
      <input type="text" name="name" placeholder="Ex.: Nubank" required>
    </div>
    <div class="field">
      <label>Bandeira</label>
      <input type="text" name="brand" placeholder="Ex.: Mastercard">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Limite (R$, opcional)</label>
        <input type="number" step="0.01" min="0" name="card_limit">
      </div>
      <div class="field">
        <label>Dia de vencimento</label>
        <input type="number" min="1" max="31" name="due_day">
      </div>
    </div>
    <div class="field">
      <label>Cor</label>
      <select name="color">
        ${CORES_CARTAO.map(c=>`<option value="${c}" style="background:${c};color:#fff">${c}</option>`).join("")}
      </select>
    </div>
  `, async (form)=>{
    const data = Object.fromEntries(new FormData(form));
    if(!data.name.trim()) return alert("Dê um nome ao cartão.");
    const payload = {
      name: data.name.trim(),
      brand: data.brand.trim(),
      card_limit: data.card_limit ? parseFloat(data.card_limit) : null,
      due_day: data.due_day ? parseInt(data.due_day) : null,
      color: data.color,
    };
    const { data: created, error } = await sbClient.from("cards").insert(payload).select().single();
    if(error) return alert("Não foi possível salvar: " + error.message);
    db.cards.push(created);
    closeModal(); renderAll();
  });
});

/* =========================================================
   INVESTIMENTOS
   ========================================================= */
function renderInvestimentos(){
  const total = db.investments.reduce((s,i)=>s+Number(i.amount),0);
  document.getElementById("stat-invest-total").textContent = brl(total);
  document.getElementById("stat-invest-count").textContent = db.investments.length;

  const porTipo = {};
  db.investments.forEach(i=> porTipo[i.type] = (porTipo[i.type]||0) + Number(i.amount));
  const labels = Object.keys(porTipo);
  const canvas = document.getElementById("chart-investimentos");
  document.getElementById("chart-investimentos-empty").hidden = labels.length>0;
  canvas.hidden = labels.length===0;
  if(chartInvestimentos) chartInvestimentos.destroy();
  if(labels.length){
    chartInvestimentos = new Chart(canvas, {
      type: "doughnut",
      data: { labels, datasets: [{ data: labels.map(l=>porTipo[l]), backgroundColor: paleta(labels.length), borderWidth: 0 }] },
      options: { plugins:{ legend:{ position:"right", labels:{ boxWidth:10, font:{ family:"Inter", size:11 } } } }, cutout:"62%" }
    });
  }

  const tbody = document.querySelector("#tabela-investimentos tbody");
  tbody.innerHTML = "";
  document.getElementById("investimentos-empty").hidden = db.investments.length>0;
  [...db.investments].sort((a,b)=>b.date.localeCompare(a.date)).forEach(i=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(i.name)}</td>
      <td>${escapeHtml(i.type)}</td>
      <td>${fmtDate(i.date)}</td>
      <td class="num">${brl(i.amount)}</td>
      <td class="row-actions"><button data-del>excluir</button></td>
    `;
    tr.querySelector("[data-del]").addEventListener("click", async ()=>{
      if(confirm("Excluir este investimento?")){
        const { error } = await sbClient.from("investments").delete().eq("id", i.id);
        if(error) return alert("Não foi possível excluir: " + error.message);
        db.investments = db.investments.filter(x=>x.id!==i.id);
        renderAll();
      }
    });
    tbody.appendChild(tr);
  });
}

document.getElementById("btn-novo-investimento").addEventListener("click", ()=>{
  openModal("Novo investimento", `
    <div class="field">
      <label>Nome</label>
      <input type="text" name="name" placeholder="Ex.: Tesouro Selic 2029" required>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Tipo</label>
        <select name="type">${TIPOS_INVESTIMENTO.map(t=>`<option>${t}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label>Valor atual (R$)</label>
        <input type="number" step="0.01" min="0" name="amount" required>
      </div>
    </div>
    <div class="field">
      <label>Data</label>
      <input type="date" name="date" required>
    </div>
    <div class="field">
      <label>Notas (opcional)</label>
      <input type="text" name="notes" placeholder="Ex.: aporte mensal automático">
    </div>
  `, async (form)=>{
    const data = Object.fromEntries(new FormData(form));
    if(!data.name.trim() || isNaN(parseFloat(data.amount))) return alert("Preencha nome e valor.");
    const payload = { name: data.name.trim(), type: data.type, amount: parseFloat(data.amount), date: data.date, notes: data.notes.trim() };
    const { data: created, error } = await sbClient.from("investments").insert(payload).select().single();
    if(error) return alert("Não foi possível salvar: " + error.message);
    db.investments.push(created);
    closeModal(); renderAll();
  });
  document.getElementById("modal-form").date.value = new Date().toISOString().slice(0,10);
});

/* =========================================================
   ORÇAMENTO
   ========================================================= */
function renderOrcamento(){
  const wrap = document.getElementById("lista-orcamento");
  wrap.innerHTML = "";
  document.getElementById("orcamento-empty").hidden = db.budgets.length>0;
  const txs = transacoesDoMes();
  db.budgets.forEach(b=>{
    const gasto = txs.filter(t=>t.type==="despesa" && t.category===b.category).reduce((s,t)=>s+Number(t.amount),0);
    const pct = b.limit_amount ? Math.min(100, (gasto/b.limit_amount)*100) : 0;
    const row = document.createElement("div");
    row.className = "budget-row";
    row.innerHTML = `
      <div class="budget-row-head"><strong>${escapeHtml(b.category)}</strong><span>${brl(gasto)} de ${brl(b.limit_amount)}</span></div>
      <div class="budget-bar-track"><div class="budget-bar-fill ${gasto>b.limit_amount?'over':''}" style="width:${pct}%"></div></div>
      <div class="budget-row-foot"><span>${gasto>b.limit_amount ? 'meta ultrapassada' : Math.round(pct)+'% usado'}</span></div>
      <div class="budget-row-actions"><button data-del>remover meta</button></div>
    `;
    row.querySelector("[data-del]").addEventListener("click", async ()=>{
      const { error } = await sbClient.from("budgets").delete().eq("id", b.id);
      if(error) return alert("Não foi possível remover: " + error.message);
      db.budgets = db.budgets.filter(x=>x.id!==b.id);
      renderAll();
    });
    wrap.appendChild(row);
  });
}

document.getElementById("btn-nova-meta-orcamento").addEventListener("click", ()=>{
  const existentes = db.budgets.map(b=>b.category);
  const disponiveis = CATEGORIAS_DESPESA.filter(c=> !existentes.includes(c));
  if(!disponiveis.length) return alert("Todas as categorias já têm meta definida.");
  openModal("Nova meta de orçamento", `
    <div class="field">
      <label>Categoria</label>
      <select name="category">${disponiveis.map(c=>`<option>${c}</option>`).join("")}</select>
    </div>
    <div class="field">
      <label>Limite mensal (R$)</label>
      <input type="number" step="0.01" min="0" name="limit_amount" required>
    </div>
  `, async (form)=>{
    const data = Object.fromEntries(new FormData(form));
    if(isNaN(parseFloat(data.limit_amount))) return alert("Informe um limite válido.");
    const payload = { category: data.category, limit_amount: parseFloat(data.limit_amount) };
    const { data: created, error } = await sbClient.from("budgets").insert(payload).select().single();
    if(error) return alert("Não foi possível salvar: " + error.message);
    db.budgets.push(created);
    closeModal(); renderAll();
  });
});

/* =========================================================
   METAS / ANOTAÇÕES
   ========================================================= */
function renderMetas(){
  const wrap = document.getElementById("lista-metas");
  wrap.innerHTML = "";
  document.getElementById("metas-empty").hidden = db.goals.length>0;
  db.goals.forEach(g=>{
    const row = document.createElement("div");
    row.className = "goal-row" + (g.done ? " is-done" : "");
    row.innerHTML = `
      <input type="checkbox" ${g.done?"checked":""}>
      <span>${escapeHtml(g.text)}</span>
      <button>remover</button>
    `;
    row.querySelector("input").addEventListener("change", async (e)=>{
      const { data: updated, error } = await sbClient.from("goals").update({ done: e.target.checked }).eq("id", g.id).select().single();
      if(error) return alert("Não foi possível salvar: " + error.message);
      db.goals = db.goals.map(x=> x.id===g.id ? updated : x);
      renderMetas();
    });
    row.querySelector("button").addEventListener("click", async ()=>{
      const { error } = await sbClient.from("goals").delete().eq("id", g.id);
      if(error) return alert("Não foi possível remover: " + error.message);
      db.goals = db.goals.filter(x=>x.id!==g.id);
      renderMetas();
    });
    wrap.appendChild(row);
  });
}

document.getElementById("form-meta").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const input = document.getElementById("input-meta");
  const text = input.value.trim();
  if(!text) return;
  const { data: created, error } = await sbClient.from("goals").insert({ text }).select().single();
  if(error) return alert("Não foi possível salvar: " + error.message);
  db.goals.push(created);
  input.value = "";
  renderMetas();
});

/* =========================================================
   BACKUP
   ========================================================= */
document.getElementById("btn-exportar").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(db, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `razao-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btn-apagar-tudo").addEventListener("click", async ()=>{
  if(!confirm("Isso vai apagar todos os dados da sua conta na nuvem. Tem certeza?")) return;
  if(!confirm("Confirma mesmo? Essa ação não pode ser desfeita.")) return;
  const userId = currentUser.id;
  await Promise.all([
    sbClient.from("transactions").delete().eq("user_id", userId),
    sbClient.from("cards").delete().eq("user_id", userId),
    sbClient.from("investments").delete().eq("user_id", userId),
    sbClient.from("budgets").delete().eq("user_id", userId),
    sbClient.from("goals").delete().eq("user_id", userId),
  ]);
  db = { transactions: [], cards: [], investments: [], budgets: [], goals: [] };
  goTo("visao-geral");
});

/* =========================================================
   MODAL GENÉRICO
   ========================================================= */
function openModal(title, bodyHtml, onSubmit){
  document.getElementById("modal-title").textContent = title;
  const form = document.getElementById("modal-form");
  form.innerHTML = bodyHtml + `
    <div class="modal-actions">
      <button type="button" class="btn" id="modal-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </div>
  `;
  document.getElementById("modal-overlay").hidden = false;
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  form.onsubmit = (e)=>{ e.preventDefault(); onSubmit(form); };
}
function closeModal(){
  document.getElementById("modal-overlay").hidden = true;
}
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-overlay").addEventListener("click", (e)=>{
  if(e.target.id==="modal-overlay") closeModal();
});
document.addEventListener("keydown", (e)=>{
  if(e.key==="Escape") closeModal();
});
