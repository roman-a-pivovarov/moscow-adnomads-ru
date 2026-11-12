(function () {
  const data = window.PHOTOBANK_DATA || { assets: [], similar: [], statuses: [], placements: [], sceneTags: [] };
  const page = window.PHOTOBANK_PAGE || { view: "all", title: "Фотобанк" };
  const root = window.PHOTOBANK_ROOT || "../..";
  const draftKey = "moscow-photobank-draft-v1";
  const assets = data.assets || [];
  const byId = new Map(assets.map((asset) => [asset.asset_id, asset]));
  const state = new Map(assets.map((asset) => [asset.asset_id, blank(asset)]));
  const picked = new Set();
  const undoStack = [];

  const dirty = new Set();
  restoreDraft();
  restoreFilters();

  const grid = document.querySelector("[data-grid]");
  const count = document.querySelector("[data-count]");
  const draftNote = document.querySelector("[data-draft]");
  const lightbox = document.querySelector("[data-lightbox]");
  let filtered = [];
  let openIndex = -1;

  document.querySelector("[data-search]")?.addEventListener("input", render);
  document.querySelector("[data-edition]")?.addEventListener("change", render);
  document.querySelector("[data-orientation]")?.addEventListener("change", render);
  document.querySelector("[data-status]")?.addEventListener("change", render);
  document.querySelector("[data-group]")?.addEventListener("change", () => { rememberFilters(); render(); });
  document.querySelector("[data-placement]")?.addEventListener("change", () => { rememberFilters(); render(); });
  document.querySelector("[data-priority]")?.addEventListener("change", () => { rememberFilters(); render(); });
  document.querySelector("[data-proposed]")?.addEventListener("change", () => { rememberFilters(); render(); });
  document.querySelector("[data-undo]")?.addEventListener("click", undo);
  document.querySelector("[data-pick-visible]")?.addEventListener("change", pickVisible);
  document.querySelector("[data-bulk-apply]")?.addEventListener("click", applyBulk);
  document.querySelector("[data-export]")?.addEventListener("click", exportDecisions);
  document.querySelector("[data-import]")?.addEventListener("change", importDecisions);
  document.querySelector("[data-forget]")?.addEventListener("click", forgetDraft);
  document.querySelector("[data-close]")?.addEventListener("click", closeLightbox);
  document.querySelector("[data-prev]")?.addEventListener("click", () => step(-1));
  document.querySelector("[data-next]")?.addEventListener("click", () => step(1));
  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });

  render();

  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (!saved || !Array.isArray(saved.decisions)) return;
      for (const decision of saved.decisions) {
        if (!state.has(decision.asset_id)) continue;
        state.set(decision.asset_id, normalize(decision));
        if (!sameAsEmbedded(decision.asset_id)) dirty.add(decision.asset_id);
      }
    } catch {
      /* черновик браузера необязателен */
    }
  }

  function saveDraft() {
    const decisions = exportList();
    localStorage.setItem(draftKey, JSON.stringify({ saved_at: new Date().toISOString(), decisions }));
    if (draftNote) {
      draftNote.hidden = dirty.size === 0;
      draftNote.textContent = dirty.size
        ? `В браузере ${dirty.size} несохранённых отметок. В реестр они не записаны.`
        : "";
    }
    const exportNote = document.querySelector("[data-export-state]");
    if (exportNote) {
      const pending = exportedPendingIds();
      const onlyHere = [...dirty].filter((id) => !pending.has(id)).length;
      exportNote.hidden = onlyHere === 0 && pending.size === 0;
      const parts = [];
      if (onlyHere) parts.push(`Только в этом браузере, ещё не экспортировано: ${onlyHere}.`);
      if (pending.size) parts.push(`Экспортировано, на сайте ещё не применено: ${pending.size}.`);
      if (!parts.length) parts.push("Открытый каталог совпадает с последней сборкой.");
      exportNote.textContent = parts.join(" ");
    }
  }

  function blank(asset) {
    return {
      status: asset.status || "unsorted",
      placements: [...(asset.placements || [])],
      priorities: { ...(asset.priorities || {}) },
      scene_tags: [...(asset.scene_tags || [])],
      caption: asset.caption || "",
      alt: asset.alt || "",
      comment: asset.comment || "",
      photographer: asset.photographer || "",
      proposed_by: asset.proposed_by || "",
    };
  }

  function pushUndo() {
    const copy = {};
    for (const [id, value] of state) copy[id] = JSON.parse(JSON.stringify(value));
    undoStack.push(copy);
    if (undoStack.length > 30) undoStack.shift();
  }

  function undo() {
    const prev = undoStack.pop();
    if (!prev) return;
    for (const [id, value] of Object.entries(prev)) {
      if (state.has(id)) state.set(id, value);
    }
    dirty.clear();
    for (const id of state.keys()) if (!sameAsEmbedded(id)) dirty.add(id);
    render();
    if (openIndex >= 0) paintLightbox();
  }

  function rememberFilters() {
    const filters = currentFilters();
    sessionStorage.setItem("moscow-photobank-filters-v1", JSON.stringify(filters));
  }

  function restoreFilters() {
    try {
      const saved = JSON.parse(sessionStorage.getItem("moscow-photobank-filters-v1") || "null");
      if (!saved) return;
      const bind = (selector, value) => {
        const node = document.querySelector(selector);
        if (node && value) node.value = value;
      };
      bind("[data-search]", saved.search || "");
      bind("[data-edition]", saved.edition || "");
      bind("[data-orientation]", saved.orientation || "");
      bind("[data-status]", saved.status || "");
      bind("[data-group]", saved.group || "");
      bind("[data-placement]", saved.placement || "");
      bind("[data-priority]", saved.priority || "");
      bind("[data-proposed]", saved.proposed || "");
    } catch {
      /* фильтр не обязателен */
    }
  }

  function exportedPendingIds() {
    const pending = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem("moscow-photobank-export-v1") || "null");
      if (!saved || !Array.isArray(saved.decisions)) return pending;
      for (const decision of saved.decisions) {
        if (!byId.has(decision.asset_id) || sameAsEmbedded(decision.asset_id)) continue;
        const current = normalize(state.get(decision.asset_id));
        const exported = normalize(decision);
        delete current.base_updated_at;
        delete exported.base_updated_at;
        if (JSON.stringify(current) === JSON.stringify(exported)) pending.add(decision.asset_id);
      }
    } catch {
      /* экспорт мог быть пустым */
    }
    return pending;
  }

  function pickVisible(event) {
    for (const asset of filtered) {
      if (event.target.checked) picked.add(asset.asset_id);
      else picked.delete(asset.asset_id);
    }
    render();
  }

  function applyBulk() {
    if (!picked.size) return;
    const status = document.querySelector("[data-bulk-status]")?.value || "";
    const placement = document.querySelector("[data-bulk-placement]")?.value || "";
    const priority = document.querySelector("[data-bulk-priority]")?.value || "normal";
    if (!status && !placement) return;
    pushUndo();
    for (const id of picked) {
      const editorial = state.get(id);
      if (!editorial) continue;
      if (status) editorial.status = status;
      if (placement) {
        if (!editorial.placements.includes(placement)) editorial.placements.push(placement);
        editorial.priorities[placement] = priority;
      }
      dirty.add(id);
    }
    render();
  }

  function forgetDraft() {
    localStorage.removeItem(draftKey);
    dirty.clear();
    for (const asset of assets) {
      state.set(asset.asset_id, blank(asset));
    }
    saveDraft();
    render();
    if (openIndex >= 0) paintLightbox();
  }

  function currentFilters() {
    return {
      search: (document.querySelector("[data-search]")?.value || "").trim().toLowerCase(),
      edition: page.view === "edition" ? page.editionId : (document.querySelector("[data-edition]")?.value || ""),
      orientation: document.querySelector("[data-orientation]")?.value || "",
      status: document.querySelector("[data-status]")?.value || "",
      group: document.querySelector("[data-group]")?.value || "",
      placement: document.querySelector("[data-placement]")?.value || "",
      priority: document.querySelector("[data-priority]")?.value || "",
      proposed: document.querySelector("[data-proposed]")?.value || "",
      person: page.view === "team" ? page.personId : "",
      category: page.view === "shared" ? "shared" : "",
    };
  }

  function matches(asset, filters) {
    if (filters.edition && asset.edition_id !== filters.edition) return false;
    if (filters.person && asset.person_id !== filters.person) return false;
    if (filters.category && asset.category !== filters.category) return false;
    if (filters.orientation && asset.orientation !== filters.orientation) return false;
    const editorial = state.get(asset.asset_id);
    if (filters.status && editorial.status !== filters.status) return false;
    if (filters.group === "edition" && !asset.edition_id) return false;
    if (filters.group === "team" && asset.category !== "team") return false;
    if (filters.group === "shared" && asset.category !== "shared") return false;
    if (filters.placement && !(editorial.placements || []).includes(filters.placement)) return false;
    if (filters.priority && !Object.values(editorial.priorities || {}).includes(filters.priority)) return false;
    if (filters.proposed === "bild-editor" && editorial.proposed_by !== "bild-editor") return false;
    if (filters.proposed === "manual" && editorial.proposed_by === "bild-editor") return false;
    if (filters.search) {
      const hay = page.public
        ? asset.asset_id
        : `${asset.asset_id} ${asset.filename || ""} ${asset.relative_path || ""}`;
      if (!hay.toLowerCase().includes(filters.search)) return false;
    }
    return true;
  }

  function render() {
    rememberFilters();
    const pickedNote = document.querySelector("[data-picked]");
    if (pickedNote) pickedNote.textContent = picked.size ? `Отмечено: ${picked.size}` : "";
    if (page.view === "similar") {
      renderSimilar();
      return;
    }
    const filters = currentFilters();
    filtered = assets.filter((asset) => matches(asset, filters));
    grid.replaceChildren();
    for (const asset of filtered) grid.append(card(asset));
    count.textContent = `${filtered.length} из ${assets.length}`;
    saveDraft();
  }

  function card(asset) {
    const editorial = state.get(asset.asset_id);
    const article = document.createElement("article");
    article.className = `card status-${editorial.status}${picked.has(asset.asset_id) ? " picked" : ""}`;
    article.dataset.assetId = asset.asset_id;
    const pick = document.createElement("label");
    pick.className = "pick";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = picked.has(asset.asset_id);
    box.addEventListener("click", (event) => event.stopPropagation());
    box.addEventListener("change", () => {
      if (box.checked) picked.add(asset.asset_id);
      else picked.delete(asset.asset_id);
      const pickedNote = document.querySelector("[data-picked]");
      if (pickedNote) pickedNote.textContent = picked.size ? `Отмечено: ${picked.size}` : "";
    });
    pick.append(box, document.createTextNode(" В подборку"));
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.tabIndex = 0;
    if (asset.thumb && !asset.process_error) {
      const img = document.createElement("img");
      img.src = srcOf(asset.thumb);
      img.alt = "";
      img.loading = "lazy";
      frame.append(img);
    } else {
      frame.textContent = asset.process_error ? "Не обработано" : "Нет превью";
      frame.style.color = "#f3efe8";
    }
    frame.addEventListener("click", () => open(asset.asset_id));
    const body = document.createElement("div");
    body.className = "body";
    body.append(line("id", asset.asset_id));
    body.append(line("meta", [asset.edition_label || asset.category, editorialLabel(editorial.status)].filter(Boolean).join(" · ")));
    const size = asset.width ? `${asset.width}×${asset.height} · ${kb(asset.bytes)}` : "веб-версии нет";
    body.append(line("meta", size));
    body.append(line("file", asset.filename || ""));
    const badges = document.createElement("div");
    badges.className = "badges";
    for (const warning of notable(asset)) badges.append(badge(warning, "warn"));
    if (asset.source_conflict) badges.append(badge("конфликт источников", "bad"));
    if (asset.source_count > 1) badges.append(badge(`точное совпадение: ${asset.source_count}`, "warn"));
    body.append(badges);
    article.append(pick, frame, body);
    return article;
  }

  function renderSimilar() {
    grid.replaceChildren();
    const pairs = data.similar || [];
    count.textContent = `${pairs.length} пар`;
    if (!pairs.length) {
      grid.textContent = "Похожих пар по перцептивному хешу нет. Это не проверка качества кадров.";
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "pairs";
    for (const pair of pairs) {
      const row = document.createElement("div");
      row.className = "pair";
      for (const id of pair.asset_ids) {
        const asset = byId.get(id);
        if (asset) row.append(card(asset));
      }
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = `Расстояние ${pair.distance}. ${pair.note}`;
      row.append(note);
      wrap.append(row);
    }
    grid.append(wrap);
  }

  function open(assetId) {
    openIndex = filtered.findIndex((asset) => asset.asset_id === assetId);
    if (openIndex < 0) return;
    lightbox.classList.add("open");
    paintLightbox();
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    openIndex = -1;
  }

  function step(delta) {
    if (openIndex < 0) return;
    openIndex = (openIndex + delta + filtered.length) % filtered.length;
    paintLightbox();
  }

  function paintLightbox() {
    const asset = filtered[openIndex];
    const editorial = state.get(asset.asset_id);
    const stage = lightbox.querySelector("[data-stage]");
    stage.replaceChildren();
    if (asset.web && !asset.process_error) {
      const img = document.createElement("img");
      img.src = srcOf(asset.web);
      img.alt = editorial.alt || "";
      stage.append(img);
    } else {
      const p = document.createElement("p");
      p.textContent = asset.process_error || "Веб-версии нет";
      stage.append(p);
    }
    const panel = lightbox.querySelector("[data-panel]");
    panel.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = asset.asset_id;
    panel.append(title);
    panel.append(paragraph([asset.edition_label || asset.category, asset.filename].filter(Boolean).join(" · ")));
    panel.append(paragraph(asset.width ? `${asset.width}×${asset.height}, ${kb(asset.bytes)}` : "без веб-версии"));
    if (asset.exif_datetime) {
      panel.append(paragraph(`EXIF: ${asset.exif_datetime}. Эта дата не выбирает выпуск.`));
    }
    if (asset.suggested_caption) {
      panel.append(paragraph(`Подпись из Google Photos не применена: ${asset.suggested_caption}`));
    }
    const statusBox = document.createElement("div");
    statusBox.className = "choices";
    for (const status of data.statuses) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = status.label;
      button.dataset.status = status.id;
      button.setAttribute("aria-pressed", String(editorial.status === status.id));
      button.addEventListener("click", () => {
        pushUndo();
        editorial.status = status.id;
        dirty.add(asset.asset_id);
        paintLightbox();
        render();
        openIndex = filtered.findIndex((item) => item.asset_id === asset.asset_id);
      });
      statusBox.append(button);
    }
    panel.append(heading("Статус"), statusBox);
    panel.append(heading("Где использовать"));
    panel.append(paragraph("Обложка выпуска — основной кадр назначения «В историю». Полароид рисует сайт, это не отдельный тип фотографии."));
    panel.append(checks(data.placements, editorial.placements, asset.asset_id, "placements"));
    panel.append(priorityFields(asset.asset_id));
    panel.append(heading("Содержание кадра"));
    panel.append(checks(data.sceneTags, editorial.scene_tags, asset.asset_id, "scene_tags"));
    panel.append(field("Подпись", editorial, "caption", asset.asset_id));
    panel.append(field("Alt", editorial, "alt", asset.asset_id));
    panel.append(field("Комментарий", editorial, "comment", asset.asset_id));
    panel.append(field("Автор фотографии", editorial, "photographer", asset.asset_id));
    const row = document.createElement("div");
    row.className = "row";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Копировать ID";
    copy.addEventListener("click", () => copyId(asset.asset_id, copy));
    row.append(copy);
    panel.append(row);
    const warnings = document.createElement("p");
    warnings.className = "hint";
    const notes = [...(asset.warnings || [])];
    warnings.textContent = notes.length
      ? `Технические пометки: ${notes.join(", ")}. Яркость и контраст не бракуют кадр.`
      : "Заметных технических пометок нет.";
    panel.append(warnings);
    if (asset.process_error) panel.append(paragraph(asset.process_error));
  }

  function checks(options, selected, assetId, key) {
    const box = document.createElement("div");
    box.className = "stack";
    for (const option of options) {
      const label = document.createElement("label");
      label.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = selected.includes(option.id);
      input.addEventListener("change", () => {
        pushUndo();
        const editorial = state.get(assetId);
        const set = new Set(editorial[key]);
        if (input.checked) set.add(option.id);
        else set.delete(option.id);
        editorial[key] = [...set];
        if (key === "placements" && !input.checked) delete editorial.priorities[option.id];
        if (key === "placements" && input.checked && !editorial.priorities[option.id]) editorial.priorities[option.id] = "normal";
        dirty.add(assetId);
        saveDraft();
        if (key === "placements") paintLightbox();
      });
      label.append(input, document.createTextNode(option.label));
      box.append(label);
    }
    return box;
  }

  function priorityFields(assetId) {
    const editorial = state.get(assetId);
    const box = document.createElement("div");
    box.className = "stack";
    for (const placementId of editorial.placements) {
      const placement = (data.placements || []).find((item) => item.id === placementId);
      const label = document.createElement("label");
      label.className = "check";
      label.append(document.createTextNode(`${placement ? placement.label : placementId}: `));
      const select = document.createElement("select");
      for (const priority of data.priorities || []) {
        const option = document.createElement("option");
        option.value = priority.id;
        option.textContent = priority.label;
        option.selected = (editorial.priorities[placementId] || "normal") === priority.id;
        select.append(option);
      }
      select.addEventListener("change", () => {
        pushUndo();
        editorial.priorities[placementId] = select.value;
        dirty.add(assetId);
        saveDraft();
      });
      label.append(select);
      box.append(label);
    }
    return box;
  }

  function field(labelText, editorial, key, assetId) {
    const wrap = document.createElement("label");
    wrap.className = "stack";
    wrap.append(document.createTextNode(labelText));
    const area = document.createElement("textarea");
    area.value = editorial[key] || "";
    area.addEventListener("input", () => {
      if (!area.dataset.undoArmed) {
        pushUndo();
        area.dataset.undoArmed = "1";
      }
      editorial[key] = area.value;
      dirty.add(assetId);
      saveDraft();
    });
    area.addEventListener("blur", () => {
      delete area.dataset.undoArmed;
    });
    wrap.append(area);
    return wrap;
  }

  function exportDecisions() {
    const decisions = exportList().filter((item) => dirty.has(item.asset_id));
    const payload = {
      schema: "moscow-photobank-decisions/v2",
      exported_at: new Date().toISOString(),
      source_generated_at: data.generated_at || "",
      note: "Файл ещё не применён. Запишите его в реестр командой apply-decisions. Старый экспорт не затирает более новые решения.",
      decisions,
    };
    localStorage.setItem("moscow-photobank-export-v1", JSON.stringify({ exported_at: payload.exported_at, decisions }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "photobank-decisions.json";
    link.click();
    URL.revokeObjectURL(link.href);
    saveDraft();
  }

  function importDecisions(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(String(reader.result));
      const decisions = Array.isArray(parsed) ? parsed : parsed.decisions || [];
      for (const decision of decisions) {
        if (!state.has(decision.asset_id)) continue;
        state.set(decision.asset_id, normalize(decision));
        dirty.add(decision.asset_id);
      }
      saveDraft();
      render();
      alert("Решения загружены в страницу. В реестр они попадут после экспорта и команды apply-decisions.");
    };
    reader.readAsText(file, "utf-8");
  }

  function exportList() {
    return assets.map((asset) => ({
      asset_id: asset.asset_id,
      ...state.get(asset.asset_id),
      base_updated_at: asset.updated_at || "",
    }));
  }

  function normalize(decision) {
    return {
      status: decision.status || "unsorted",
      placements: [...(decision.placements || [])],
      priorities: { ...(decision.priorities || {}) },
      scene_tags: [...(decision.scene_tags || [])],
      caption: decision.caption || "",
      alt: decision.alt || "",
      comment: decision.comment || "",
      photographer: decision.photographer || "",
      proposed_by: decision.proposed_by || "",
      base_updated_at: decision.updated_at || decision.base_updated_at || "",
    };
  }

  function sameAsEmbedded(assetId) {
    const asset = byId.get(assetId);
    const editorial = state.get(assetId);
    const left = normalize(asset);
    const right = normalize(editorial);
    delete left.base_updated_at;
    delete right.base_updated_at;
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function notable(asset) {
    const codes = new Set(["over_budget", "small_source", "thumb_over_budget"]);
    return (asset.warnings || []).filter((warning) => codes.has(warning) || warning.startsWith("process"));
  }

  function editorialLabel(status) {
    return (data.statuses.find((item) => item.id === status) || {}).label || status;
  }

  function srcOf(rel) {
    return `${root}/${String(rel).replace(/^\/+/, "")}`;
  }

  function kb(bytes) {
    if (!bytes) return "0 КБ";
    return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  }

  function line(className, text) {
    const node = document.createElement("div");
    node.className = className;
    node.textContent = text;
    return node;
  }

  function badge(text, kind) {
    const node = document.createElement("span");
    node.className = `badge ${kind || ""}`;
    node.textContent = text;
    return node;
  }

  function paragraph(text) {
    const node = document.createElement("p");
    node.className = "hint";
    node.textContent = text;
    return node;
  }

  function heading(text) {
    const node = document.createElement("h3");
    node.textContent = text;
    return node;
  }

  async function copyId(id, button) {
    try {
      await navigator.clipboard.writeText(id);
      button.textContent = "Скопировано";
    } catch {
      const input = document.createElement("input");
      input.value = id;
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      button.textContent = "Скопировано";
    }
  }

  window.MOSCOW_PHOTOBANK = {
    getState: () => exportList(),
    open: (id) => open(id),
  };
})();
