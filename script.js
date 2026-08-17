(function(){
  const STORAGE_PREFIX = 'ledger_';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const pickBtn = document.getElementById('pickBtn');
  const statusEl = document.getElementById('status');
  const statusPill = document.getElementById('statusPill');
  const statusPillText = document.getElementById('statusPillText');
  const clearBtn = document.getElementById('clearBtn');

  const FLAGS = {
    'Australia':'🇦🇺','New Zealand':'🇳🇿','Canada':'🇨🇦','United States':'🇺🇸','Japan':'🇯🇵',
    'South Africa':'🇿🇦','France':'🇫🇷','Germany':'🇩🇪','Italy':'🇮🇹','Portugal':'🇵🇹',
    'Belgium':'🇧🇪','Netherlands':'🇳🇱','Switzerland':'🇨🇭','Sweden':'🇸🇪','Lithuania':'🇱🇹',
    'Greece':'🇬🇷','Romania':'🇷🇴','Thailand':'🇹🇭','Egypt':'🇪🇬','Spain':'🇪🇸','Espanha':'🇪🇸',
    'Mexico':'🇲🇽','Brazil':'🇧🇷','United Kingdom':'🇬🇧','Ireland':'🇮🇪','Poland':'🇵🇱',
    'Austria':'🇦🇹','Denmark':'🇩🇰','Norway':'🇳🇴','Finland':'🇫🇮','India':'🇮🇳','Chile':'🇨🇱',
    'Colombia':'🇨🇴','Argentina':'🇦🇷','Peru':'🇵🇪','Czechia':'🇨🇿','Latvia':'🇱🇻'
  };
  function flagFor(country){ return FLAGS[country] || '🌐'; }

  // Adivinha o país (código ISO2, pra bandeira em imagem) a partir do nome/label da campanha —
  // mais confiável que a coluna "Pais" das linhas filhas, que às vezes reflete a conta de anúncio
  // (ex.: campanha "EGITO" com Pais = "United States" porque a conta roda nos EUA).
  const COUNTRY_KEYWORDS = [
    ['NOVA ZELAND','nz','New Zealand'], ['NEW ZEALAND','nz','New Zealand'], ['NEW ZELAND','nz','New Zealand'],
    ['AUSTRALIA','au','Australia'],
    ['SOUTH AFRICA','za','South Africa'], ['AFRICA','za','South Africa'],
    ['CANADA','ca','Canada'],
    ['ESTADOS UNIDOS','us','United States'], ['UNITED STATES','us','United States'], ['EUA','us','United States'],
    ['JAPAO','jp','Japan'], ['JAPAN','jp','Japan'],
    ['FRANCA','fr','France'], ['FRANCE','fr','France'],
    ['ALEMANHA','de','Germany'], ['GERMANY','de','Germany'],
    ['ITALIA','it','Italy'], ['ITALY','it','Italy'],
    ['PORTUGAL','pt','Portugal'],
    ['BELGICA','be','Belgium'], ['BELGIUM','be','Belgium'], ['BELG','be','Belgium'],
    ['HOLANDA','nl','Netherlands'], ['NETHERLANDS','nl','Netherlands'],
    ['SUICA','ch','Switzerland'], ['SWITZERLAND','ch','Switzerland'],
    ['SUECIA','se','Sweden'], ['SWEDEN','se','Sweden'],
    ['LITUANIA','lt','Lithuania'], ['LITHUANIA','lt','Lithuania'],
    ['TCHECA','cz','Czechia'], ['CZECH','cz','Czechia'],
    ['BRASIL','br','Brazil'], ['BRAZIL','br','Brazil'],
    ['LETONIA','lv','Latvia'], ['LATVIA','lv','Latvia'],
    ['TURQUIA','tr','Türkiye'], ['TURKEY','tr','Türkiye'], ['TURKIYE','tr','Türkiye'],
    ['ESPANHA','es','Espanha'], ['SPAIN','es','Espanha'],
    ['GRECIA','gr','Greece'], ['GREECE','gr','Greece'],
    ['ROMENIA','ro','Romania'], ['ROMANIA','ro','Romania'],
    ['TAILANDIA','th','Thailand'], ['THAILAND','th','Thailand'],
    ['EGITO','eg','Egypt'], ['EGYPT','eg','Egypt'],
  ].sort((a,b) => b[0].length - a[0].length);

  function stripAccents(s){
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function guessCountry(text){
    const t = stripAccents(text).toUpperCase();
    for (const [kw, code, name] of COUNTRY_KEYWORDS){
      if (t.indexOf(kw) !== -1) return { code, name };
    }
    return null;
  }

  function flagImg(code){
    if (!code) return '<span class="rank-flag-fallback">🌐</span>';
    return '<img class="rank-flag-img" src="https://flagcdn.com/24x18/' + code + '.png" alt="" width="22" height="16">';
  }

  function setStatus(msg, cls){
    statusEl.textContent = msg;
    statusEl.className = 'status-msg' + (cls ? ' ' + cls : '');
  }
  function setPill(text, active){
    statusPillText.textContent = text;
    statusPill.className = 'status-pill' + (active ? '' : ' idle');
  }

  function parseBRNumber(str){
    if (str == null) return null;
    let s = String(str).trim();
    if (s === '') return null;
    const isNegative = /^-/.test(s) || /^\(.*\)$/.test(s);
    s = s.replace(/[^\d.,]/g, '');
    if (s === '') return null;
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
      s = s.replace(/\./g,'').replace(',', '.');
    } else if (s.indexOf(',') !== -1) {
      s = s.replace(',', '.');
    }
    let n = parseFloat(s);
    if (isNaN(n)) return null;
    if (isNegative && n > 0) n = -n;
    return n;
  }

  function fmtBRL(n){ return n == null ? '—' : 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function fmtUSD(n){ return n == null ? '—' : '$' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function fmtPct(n){ return n == null ? '—' : n.toLocaleString('pt-BR', {maximumFractionDigits:1}) + '%'; }

  function parseDateCell(text){
    const s = String(text || '').trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0');
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
    return null;
  }
  function todayISO(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function findDateBlocks(rows){
    for (let i = 0; i < rows.length; i++){
      const row = rows[i];
      const found = [];
      for (let c = 0; c < row.length; c++){
        const iso = parseDateCell(row[c]);
        if (iso) found.push({ col: c, date: iso });
      }
      if (found.length >= 1) return { rowIndex: i, blocks: found };
    }
    return null;
  }

  function findTotalsInRange(rows, startCol, endCol){
    const targets = ['Total Gasto','Total Retorno','Lucro Total','% Total'];
    for (let i = 0; i < rows.length; i++){
      const row = rows[i].map(c => String(c || ''));
      const positions = {};
      targets.forEach(t => {
        for (let c = startCol; c <= endCol && c < row.length; c++){
          if (row[c].toLowerCase().indexOf(t.toLowerCase()) !== -1){ positions[t] = c; break; }
        }
      });
      if (Object.keys(positions).length >= 3 && rows[i+1]) {
        const valueRow = rows[i+1];
        return {
          gasto: parseBRNumber(valueRow[positions['Total Gasto']]),
          retorno: parseBRNumber(valueRow[positions['Total Retorno']]),
          lucro: parseBRNumber(valueRow[positions['Lucro Total']]),
          pct: parseBRNumber(valueRow[positions['% Total']]),
        };
      }
    }
    return null;
  }

  function findGroupColStart(rows, startCol, endCol){
    for (let i = 0; i < rows.length; i++){
      const row = rows[i];
      for (let c = startCol; c <= endCol && c < row.length; c++){
        const cell = String(row[c] || '').toLowerCase();
        if (cell.indexOf('facebook r$') !== -1 || cell === 'gasto r$') return c;
      }
    }
    return startCol;
  }

  function buildCampaignRanking(rows, startCol, endCol){
    const headerIdx = rows.findIndex(r => (r[0]||'').trim().toUpperCase() === 'CONTA DE ANUNCIOS / SITE');
    const totalIdx = rows.findIndex(r => (r[0]||'').trim().toUpperCase() === 'TOTAL');
    if (headerIdx === -1) return [];
    const end = totalIdx !== -1 ? totalIdx : rows.length;
    const groupCol = findGroupColStart(rows, startCol, endCol);

    const items = [];
    for (let i = headerIdx + 1; i < end; i++){
      const row = rows[i];
      if (!row) continue;
      const acc = (row[0]||'').trim();
      const split = (row[1]||'').trim();
      if (!acc || split) continue; // só linhas de grupo (sem Split preenchido)

      const gastoVal = parseBRNumber(row[groupCol]);
      if (gastoVal === null) continue; // sem dado nesse bloco de data
      const retornoVal = parseBRNumber(row[groupCol+1]);
      const lucroVal = parseBRNumber(row[groupCol+2]);
      const pctVal = parseBRNumber(row[groupCol+3]);

      const utmLabel = (row[4]||'').trim();
      const label = utmLabel || acc;
      const guess = guessCountry(utmLabel + ' ' + acc);

      // linhas-filhas (splits) desse grupo, pra detalhar ao expandir
      const children = [];
      for (let j = i+1; j < end; j++){
        const childSplit = (rows[j][1]||'').trim();
        if (!childSplit) break;
        children.push({
          account: (rows[j][0]||'').trim(),
          split: childSplit,
          utm: (rows[j][4]||'').trim(),
          country: (rows[j][5]||'').trim(),
          retorno: parseBRNumber(rows[j][groupCol+1]),
        });
      }

      items.push({
        label, acc,
        flagCode: guess ? guess.code : null,
        gasto: gastoVal, retorno: retornoVal, lucro: lucroVal, pct: pctVal,
        children
      });
    }
    return items.sort((a,b) => b.lucro - a.lucro);
  }

  function extractSnapshot(rows, preferredDate){
    const dateInfo = findDateBlocks(rows);
    if (!dateInfo || !dateInfo.blocks.length){
      const maxCol = Math.max(...rows.map(r => r.length)) - 1;
      const snap = findTotalsInRange(rows, 0, maxCol);
      return snap ? { snapshot: snap, dateUsed: null, availableDates: [], ranking: [] } : null;
    }
    const blocks = dateInfo.blocks.slice().sort((a,b) => a.col - b.col);
    const availableDates = blocks.map(b => b.date);
    const wanted = preferredDate || todayISO();
    const target = blocks.find(b => b.date === wanted);
    if (!target) return { snapshot: null, dateUsed: null, availableDates, ranking: [] };

    const idx = blocks.indexOf(target);
    const maxCol = Math.max(...rows.map(r => r.length)) - 1;
    const startCol = target.col;
    const endCol = (idx + 1 < blocks.length) ? blocks[idx+1].col - 1 : maxCol;

    const snap = findTotalsInRange(rows, startCol, endCol);
    const ranking = buildCampaignRanking(rows, startCol, endCol);
    return { snapshot: snap, dateUsed: target.date, availableDates, ranking };
  }

  function saveSnapshot(snap, ranking){
    const key = STORAGE_PREFIX + Date.now();
    const record = Object.assign({}, snap, { ts: Date.now(), ranking: ranking || [] });
    localStorage.setItem(key, JSON.stringify(record));
  }

  function loadAllSnapshots(){
    const items = [];
    for (let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if (key && key.indexOf(STORAGE_PREFIX) === 0){
        try { items.push(JSON.parse(localStorage.getItem(key))); } catch(e){}
      }
    }
    items.sort((a,b) => a.ts - b.ts);
    return items;
  }

  function clearAll(){
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if (key && key.indexOf(STORAGE_PREFIX) === 0) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    render([]);
  }

  function deleteEntry(ts){
    localStorage.removeItem(STORAGE_PREFIX + ts);
    render(loadAllSnapshots());
  }

  function renderKPIs(snap){
    document.getElementById('valGasto').textContent = fmtBRL(snap ? snap.gasto : null);
    document.getElementById('valRetorno').textContent = fmtUSD(snap ? snap.retorno : null);
    const lucroEl = document.getElementById('valLucro');
    lucroEl.textContent = fmtBRL(snap ? snap.lucro : null);
    lucroEl.classList.toggle('neg', !!(snap && snap.lucro < 0));

    const pctEl = document.getElementById('valPct');
    if (snap && snap.pct != null){
      pctEl.style.display = 'inline-block';
      pctEl.textContent = fmtPct(snap.pct);
      pctEl.className = 'badge ' + (snap.pct >= 0 ? 'pos' : 'neg');
    } else {
      pctEl.style.display = 'none';
    }
  }

  function renderSparkline(items){
    const svg = document.getElementById('sparkline');
    svg.innerHTML = '';
    const vals = items.map(i => i.lucro).filter(v => v != null);
    if (vals.length < 2) {
      svg.innerHTML = '<text x="300" y="38" fill="#7C88AC" font-size="11" text-anchor="middle" font-family="IBM Plex Mono, monospace">Aguardando mais lançamentos para traçar a tendência</text>';
      return;
    }
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = 6, w = 600, h = 72;
    const range = (max - min) || 1;
    const pts = vals.map((v,i) => {
      const x = pad + (i * (w - pad*2) / (vals.length - 1));
      const y = h - pad - ((v - min) / range) * (h - pad*2);
      return [x,y];
    });
    const path = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const line = document.createElementNS('http://www.w3.org/2000/svg','path');
    line.setAttribute('d', path);
    line.setAttribute('fill','none');
    line.setAttribute('stroke','#5B7FFF');
    line.setAttribute('stroke-width','2');
    svg.appendChild(line);
    const last = pts[pts.length-1];
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); dot.setAttribute('r','3.5');
    dot.setAttribute('fill','#E4B860');
    svg.appendChild(dot);
  }

  // Ranking de campanhas/países (usado dentro do detalhe de cada lançamento)
  function buildRankingElement(ranking){
    const box = document.createElement('div');
    if (!ranking || !ranking.length){
      box.innerHTML = '<div class="empty">Sem dados de campanha nesse lançamento.</div>';
      return box;
    }
    const maxAbs = Math.max(...ranking.map(r => Math.abs(r.lucro))) || 1;
    const list = document.createElement('div');
    list.className = 'rank-list';

    ranking.forEach((r, idx) => {
      const row = document.createElement('div');
      row.className = 'rank-row';
      const barPct = Math.max(4, Math.round((Math.abs(r.lucro) / maxAbs) * 100));
      const isNeg = r.lucro < 0;
      row.innerHTML =
        '<span class="rank-num">' + (idx+1) + '</span>' +
        '<span class="rank-flag">' + flagImg(r.flagCode) + '</span>' +
        '<span class="rank-country" title="' + r.label + '">' + r.label + '</span>' +
        '<span class="rank-bar-wrap"><span class="rank-bar' + (isNeg ? ' neg' : '') + '" style="width:' + barPct + '%"></span></span>' +
        '<span class="rank-value ' + (isNeg ? 'neg' : 'pos') + '">' + fmtBRL(r.lucro) + '</span>' +
        '<span class="rank-chevron">▶</span>';

      const childBox = document.createElement('div');
      childBox.className = 'campaign-detail';
      if (r.children && r.children.length){
        const rowsHtml = r.children.map(c =>
          '<tr><td>' + c.account + '</td><td>' + c.split + '</td><td>' + (c.country || '—') + '</td>' +
          '<td class="' + (c.retorno < 0 ? 'neg' : 'pos') + '">' + fmtUSD(c.retorno) + '</td></tr>'
        ).join('');
        childBox.innerHTML =
          '<table><thead><tr><th>Conta</th><th>Split</th><th>País (conta)</th><th>Retorno</th></tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody></table>';
      } else {
        childBox.innerHTML = '<div class="empty" style="padding:8px 0;">Sem splits detalhados pra essa campanha.</div>';
      }

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !row.classList.contains('open');
        row.classList.toggle('open', willOpen);
        childBox.classList.toggle('open', willOpen);
      });

      list.appendChild(row);
      list.appendChild(childBox);
    });

    box.appendChild(list);
    return box;
  }

  function renderEntries(items){
    const wrap = document.getElementById('ledgerWrap');
    if (!items.length){
      wrap.innerHTML = '<div class="empty">Envie um CSV para começar a registrar os horários.</div>';
      return;
    }
    wrap.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'entry-header-row';
    header.innerHTML =
      '<span class="entry-time">Horário</span>' +
      '<span class="entry-col">Gasto</span>' +
      '<span class="entry-col">Retorno</span>' +
      '<span class="entry-col">Lucro</span>' +
      '<span class="entry-pct">%</span>' +
      '<span class="entry-chevron"></span>' +
      '<span class="entry-delete-spacer"></span>';
    wrap.appendChild(header);

    const list = document.createElement('div');
    list.className = 'entry-list';

    items.slice().reverse().forEach(it => {
      const time = new Date(it.ts).toLocaleString('pt-BR', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'});
      const row = document.createElement('div');
      row.className = 'entry-row';
      const isNeg = it.lucro < 0;
      row.innerHTML =
        '<span class="entry-time">' + time + '</span>' +
        '<span class="entry-col gasto">' + fmtBRL(it.gasto) + '</span>' +
        '<span class="entry-col retorno">' + fmtUSD(it.retorno) + '</span>' +
        '<span class="entry-col lucro' + (isNeg ? ' neg' : '') + '">' + fmtBRL(it.lucro) + '</span>' +
        '<span class="entry-pct">' + fmtPct(it.pct) + '</span>' +
        '<span class="entry-chevron">▶</span>' +
        '<button class="entry-delete" title="Apagar esse lançamento">🗑</button>';

      const detail = document.createElement('div');
      detail.className = 'entry-detail';
      const title = document.createElement('p');
      title.className = 'entry-detail-title';
      title.textContent = 'Ranking por país · ' + time;
      detail.appendChild(title);
      detail.appendChild(buildRankingElement(it.ranking));

      row.addEventListener('click', () => {
        const willOpen = !row.classList.contains('open');
        row.classList.toggle('open', willOpen);
        detail.classList.toggle('open', willOpen);
      });

      const deleteBtn = row.querySelector('.entry-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Apagar o lançamento de ' + time + '?')) {
          deleteEntry(it.ts);
        }
      });

      list.appendChild(row);
      list.appendChild(detail);
    });

    wrap.appendChild(list);
  }

  function render(items){
    const last = items.length ? items[items.length-1] : null;
    renderKPIs(last);
    renderSparkline(items);
    renderEntries(items);
    const lastUpdated = document.getElementById('lastUpdated');
    lastUpdated.textContent = last
      ? 'Último lançamento: ' + new Date(last.ts).toLocaleString('pt-BR')
      : 'Nenhum lançamento ainda';
    setPill(last ? 'Atualizado' : 'Aguardando CSV', !!last);
  }

  async function handleFile(file){
    if (!file){ return; }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatus('Envie um arquivo .csv exportado da planilha.', 'err');
      return;
    }
    setStatus('Lendo arquivo...', '');
    const text = await file.text();
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const result = extractSnapshot(parsed.data);

    if (!result) {
      setStatus('Não encontrei as colunas esperadas (Total Gasto, Total Retorno, Lucro Total, % Total) nesse CSV.', 'err');
      return;
    }
    if (!result.snapshot) {
      const hoje = todayISO();
      const disponiveis = result.availableDates.length ? result.availableDates.join(', ') : 'nenhuma data encontrada';
      setStatus('Não encontrei o dia de hoje (' + hoje + ') nesse CSV. Datas disponíveis: ' + disponiveis, 'err');
      return;
    }

    saveSnapshot(result.snapshot, result.ranking);
    const label = result.dateUsed ? (' (' + result.dateUsed + ')') : '';
    setStatus('Lançamento registrado com sucesso' + label + '.', 'ok');
    render(loadAllSnapshots());
  }

  pickBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag');
    handleFile(e.dataTransfer.files[0]);
  });
  clearBtn.addEventListener('click', () => {
    if (confirm('Apagar todo o histórico de lançamentos?')) clearAll();
  });

  render(loadAllSnapshots());
})();
