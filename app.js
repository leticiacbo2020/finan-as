/* =========================================================
   RAZÃO — controle financeiro pessoal
   Tudo roda no navegador. Dados em localStorage.
   ========================================================= */

const STORAGE_KEY = "razao-financeiro-v1";

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

/* ---------- estado ---------- */
let db = loadDB();
let currentView = "visao-geral";
let currentMonth = todayMonth(); // "YYYY-MM"
let chartCategorias = null;
let chartInvestimentos = null;

function todayMonth(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function loadDB(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.error("Falha ao ler dados salvos", e); }
  return { transactions: [], cards: [], investments: [], budgets: [] };
}
function saveDB(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

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

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
const VIEW_META = {
  "visao-geral": ["Visão geral", "Resumo do seu momento financeiro"],
  "transacoes": ["Transações", "Todos os seus lançamentos"],
  "cartoes": ["Cartões", "Limites e faturas por cartão"],
  "investimentos": ["Investimentos", "Onde seu dinheiro está alocado"],
  "orcamento": ["Orçamento", "Metas de gasto por categoria"],
  "backup": ["Backup", "Exportar, importar ou apagar seus dados"],
};

document.getElementById("nav").addEventListener("click", (e)=>{
  const btn = e.target.closest("[data-view]");
  if(btn) goTo(btn.dataset.view);
});
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
}

function transacoesDoMes(mes = currentMonth){
  return db.transactions.filter(t => t.date.startsWith(mes));
}

/* =========================================================
   VISÃO GERAL
   ========================================================= */
function renderVisaoGeral(){
  const txs = transacoesDoMes();
  const receitas = txs.filter(t=>t.type==="receita").reduce((s,t)=>s+t.amount,0);
  const despesas = txs.filter(t=>t.type==="despesa").reduce((s,t)=>s+t.amount,0);
  const totalInvest = db.investments.reduce((s,i)=>s+i.amount,0);

  document.getElementById("stat-saldo").textContent = brl(receitas-despesas);
  document.getElementById("stat-receitas").textContent = brl(receitas);
  document.getElementById("stat-despesas").textContent = brl(despesas);
  document.getElementById("stat-invest").textContent = brl(totalInvest);

  // gráfico por categoria
  const porCategoria = {};
  txs.filter(t=>t.type==="despesa").forEach(t=>{
    porCategoria[t.category] = (porCategoria[t.category]||0) + t.amount;
  });
  const labels = Object.keys(porCategoria);
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
          backgroundColor: ["#33543A","#8A3B2E","#A9822F","#1C2430","#5B6472","#7A9482","#B98C77","#C7B27A","#95A0AC","#4E6B54","#734A3E"],
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
    const fatura = txs.filter(t=>t.cardId===c.id && t.type==="despesa").reduce((s,t)=>s+t.amount,0);
    const row = document.createElement("div");
    row.className = "budget-row";
    const pct = c.limit ? Math.min(100, (fatura/c.limit)*100) : 0;
    row.innerHTML = `
      <div class="budget-row-head"><strong>${escapeHtml(c.name)}</strong><span>${brl(fatura)}</span></div>
      <div class="budget-bar-track"><div class="budget-bar-fill ${pct>=100?'over':''}" style="width:${pct}%;background:${c.color}"></div></div>
      <div class="budget-row-foot"><span>${c.limit? 'limite '+brl(c.limit) : 'sem limite definido'}</span><span>${c.limit? Math.round(pct)+'%':''}</span></div>
    `;
    wrap.appendChild(row);
  });

  // últimos lançamentos (globais, não só do mês)
  const recentes = [...db.transactions].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,6);
  const tbody = document.querySelector("#tabela-recentes tbody");
  tbody.innerHTML = "";
  document.getElementById("recentes-empty").hidden = recentes.length>0;
  recentes.forEach(t=>{
    tbody.appendChild(trTransacao(t, false));
  });
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
  cardSel.innerHTML = '<option value="">Todos os cartões</option>';
  db.cards.forEach(c=>{
    const o = document.createElement("option"); o.value=c.id; o.textContent=c.name;
    cardSel.appendChild(o);
  });
}

["filtro-tipo","filtro-categoria","filtro-cartao"].forEach(id=>{
  document.getElementById(id).addEventListener("change", renderTransacoes);
});

function renderTransacoes(){
  const tipo = document.getElementById("filtro-tipo").value;
  const categoria = document.getElementById("filtro-categoria").value;
  const cartao = document.getElementById("filtro-cartao").value;

  let txs = transacoesDoMes();
  if(tipo) txs = txs.filter(t=>t.type===tipo);
  if(categoria) txs = txs.filter(t=>t.category===categoria);
  if(cartao) txs = txs.filter(t=>t.cardId===cartao);
  txs = txs.sort((a,b)=> b.date.localeCompare(a.date));

  const tbody = document.querySelector("#tabela-transacoes tbody");
  tbody.innerHTML = "";
  document.getElementById("transacoes-empty").hidden = txs.length>0;
  txs.forEach(t=> tbody.appendChild(trTransacao(t, true)));
}

function trTransacao(t, withActions){
  const tr = document.createElement("tr");
  const card = db.cards.find(c=>c.id===t.cardId);
  const origem = card ? card.name : (t.type==="receita" ? "Receita" : "Conta/dinheiro");
  tr.innerHTML = `
    <td>${fmtDate(t.date)}</td>
    <td>${escapeHtml(t.description)}</td>
    <td>${escapeHtml(t.category)}</td>
    ${withActions ? `<td>${escapeHtml(origem)}</td>` : ""}
    <td class="num ${t.type==='receita'?'amount--pos':'amount--neg'}">${t.type==='receita'?'+':'−'} ${brl(t.amount)}</td>
    ${withActions ? `<td class="row-actions"><button data-edit="${t.id}">editar</button><button data-del="${t.id}">excluir</button></td>` : ""}
  `;
  if(withActions){
    tr.querySelector("[data-edit]").addEventListener("click", ()=> openTransacaoModal(t));
    tr.querySelector("[data-del]").addEventListener("click", ()=>{
      if(confirm("Excluir este lançamento?")){
        db.transactions = db.transactions.filter(x=>x.id!==t.id);
        saveDB(); renderAll();
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
    <div class="field" id="field-cartao">
      <label>Pago no cartão (opcional)</label>
      <select name="cardId">
        <option value="">— não é cartão —</option>
        ${cardOptions}
      </select>
    </div>
  `, (form)=>{
    const data = Object.fromEntries(new FormData(form));
    const tx = {
      id: t ? t.id : uid(),
      type: data.type,
      date: data.date,
      description: data.description.trim(),
      category: data.category,
      amount: parseFloat(data.amount),
      cardId: data.cardId || null,
    };
    if(!tx.description || isNaN(tx.amount) || tx.amount<=0) return alert("Preencha descrição e valor corretamente.");
    if(t){
      db.transactions = db.transactions.map(x=> x.id===t.id ? tx : x);
    } else {
      db.transactions.push(tx);
    }
    saveDB(); closeModal(); renderAll();
  });

  const typeSel = document.getElementById("f-type");
  const catSel = document.getElementById("f-category");
  function refreshCats(){
    const list = typeSel.value==="receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
    catSel.innerHTML = list.map(c=>`<option value="${c}">${c}</option>`).join("");
    if(t) catSel.value = t.category;
  }
  typeSel.addEventListener("change", refreshCats);

  if(t){
    document.getElementById("modal-form").date.value = t.date;
    document.getElementById("modal-form").description.value = t.description;
    document.getElementById("modal-form").amount.value = t.amount;
    typeSel.value = t.type;
    document.getElementById("modal-form").cardId.value = t.cardId || "";
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
    const fatura = txs.filter(t=>t.cardId===c.id && t.type==="despesa").reduce((s,t)=>s+t.amount,0);
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
        <div class="cc-limite">${c.limit ? 'limite '+brl(c.limit) : 'sem limite definido'} · vence dia ${c.dueDay||'—'}</div>
      </div>
    `;
    el.querySelector(".cc-remove").addEventListener("click", ()=>{
      if(confirm(`Remover o cartão "${c.name}"? Lançamentos vinculados a ele não serão apagados.`)){
        db.cards = db.cards.filter(x=>x.id!==c.id);
        saveDB(); renderAll();
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
        <input type="number" step="0.01" min="0" name="limit">
      </div>
      <div class="field">
        <label>Dia de vencimento</label>
        <input type="number" min="1" max="31" name="dueDay">
      </div>
    </div>
    <div class="field">
      <label>Cor</label>
      <select name="color">
        ${CORES_CARTAO.map(c=>`<option value="${c}" style="background:${c};color:#fff">${c}</option>`).join("")}
      </select>
    </div>
  `, (form)=>{
    const data = Object.fromEntries(new FormData(form));
    if(!data.name.trim()) return alert("Dê um nome ao cartão.");
    db.cards.push({
      id: uid(),
      name: data.name.trim(),
      brand: data.brand.trim(),
      limit: data.limit ? parseFloat(data.limit) : null,
      dueDay: data.dueDay ? parseInt(data.dueDay) : null,
      color: data.color,
    });
    saveDB(); closeModal(); renderAll();
  });
});

/* =========================================================
   INVESTIMENTOS
   ========================================================= */
function renderInvestimentos(){
  const total = db.investments.reduce((s,i)=>s+i.amount,0);
  document.getElementById("stat-invest-total").textContent = brl(total);
  document.getElementById("stat-invest-count").textContent = db.investments.length;

  const porTipo = {};
  db.investments.forEach(i=> porTipo[i.type] = (porTipo[i.type]||0) + i.amount);
  const labels = Object.keys(porTipo);
  const canvas = document.getElementById("chart-investimentos");
  document.getElementById("chart-investimentos-empty").hidden = labels.length>0;
  canvas.hidden = labels.length===0;
  if(chartInvestimentos) chartInvestimentos.destroy();
  if(labels.length){
    chartInvestimentos = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: labels.map(l=>porTipo[l]),
          backgroundColor: ["#33543A","#A9822F","#8A3B2E","#1C2430","#5B6472","#7A9482","#B98C77","#C7B27A"],
          borderWidth: 0,
        }]
      },
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
    tr.querySelector("[data-del]").addEventListener("click", ()=>{
      if(confirm("Excluir este investimento?")){
        db.investments = db.investments.filter(x=>x.id!==i.id);
        saveDB(); renderAll();
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
  `, (form)=>{
    const data = Object.fromEntries(new FormData(form));
    if(!data.name.trim() || isNaN(parseFloat(data.amount))) return alert("Preencha nome e valor.");
    db.investments.push({
      id: uid(), name: data.name.trim(), type: data.type,
      amount: parseFloat(data.amount), date: data.date, notes: data.notes.trim(),
    });
    saveDB(); closeModal(); renderAll();
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
    const gasto = txs.filter(t=>t.type==="despesa" && t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct = b.limit ? Math.min(100, (gasto/b.limit)*100) : 0;
    const row = document.createElement("div");
    row.className = "budget-row";
    row.innerHTML = `
      <div class="budget-row-head"><strong>${escapeHtml(b.category)}</strong><span>${brl(gasto)} de ${brl(b.limit)}</span></div>
      <div class="budget-bar-track"><div class="budget-bar-fill ${gasto>b.limit?'over':''}" style="width:${pct}%"></div></div>
      <div class="budget-row-foot"><span>${gasto>b.limit ? 'meta ultrapassada' : Math.round(pct)+'% usado'}</span></div>
      <div class="budget-row-actions"><button data-del>remover meta</button></div>
    `;
    row.querySelector("[data-del]").addEventListener("click", ()=>{
      db.budgets = db.budgets.filter(x=>x.id!==b.id);
      saveDB(); renderAll();
    });
    wrap.appendChild(row);
  });
}

document.getElementById("btn-nova-meta").addEventListener("click", ()=>{
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
      <input type="number" step="0.01" min="0" name="limit" required>
    </div>
  `, (form)=>{
    const data = Object.fromEntries(new FormData(form));
    if(isNaN(parseFloat(data.limit))) return alert("Informe um limite válido.");
    db.budgets.push({ id: uid(), category: data.category, limit: parseFloat(data.limit) });
    saveDB(); closeModal(); renderAll();
  });
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

document.getElementById("input-importar").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed || typeof parsed !== "object") throw new Error("formato inválido");
      db = {
        transactions: parsed.transactions || [],
        cards: parsed.cards || [],
        investments: parsed.investments || [],
        budgets: parsed.budgets || [],
      };
      saveDB();
      alert("Backup importado com sucesso.");
      goTo("visao-geral");
    }catch(err){
      alert("Não foi possível ler esse arquivo. Confira se é um backup exportado por este site.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("btn-apagar-tudo").addEventListener("click", ()=>{
  if(confirm("Isso vai apagar todos os dados deste navegador. Tem certeza?")){
    if(confirm("Confirma mesmo? Essa ação não pode ser desfeita.")){
      db = { transactions: [], cards: [], investments: [], budgets: [] };
      saveDB(); goTo("visao-geral");
    }
  }
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

/* =========================================================
   UTIL
   ========================================================= */
function escapeHtml(str){
  return String(str??"").replace(/[&<>"']/g, s=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

/* =========================================================
   START
   ========================================================= */
goTo("visao-geral");
