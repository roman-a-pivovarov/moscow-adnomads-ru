(function () {
  const data = window.LOGOS_DATA;
  const root = data.asset_root || "../../../";
  const draftKey = "moscow-logos-draft-v1";
  const exportKey = "moscow-logos-export-v1";
  const orgs = data.organizations || [];
  const sourceTypes = new Map((data.source_types || []).map((item) => [item.id, item]));
  const state = new Map(orgs.map((org) => [org.organization_id, blank(org)]));
  const dirty = new Set();
  let selectedOnly = false;

  restoreDraft();

  const grid = document.querySelector("[data-grid]");
  const selectedBox = document.querySelector("[data-selected]");
  document.querySelector("[data-search]")?.addEventListener("input", render);
  document.querySelector("[data-edition]")?.addEventListener("change", render);
  document.querySelector("[data-filter]")?.addEventListener("change", render);
  document.querySelector("[data-view-toggle]")?.addEventListener("click", () => {
    selectedOnly = !selectedOnly;
    document.querySelector("[data-view-toggle]").textContent = selectedOnly ? "Все карточки" : "Только выбранные";
    render();
  });
  document.querySelector("[data-export]")?.addEventListener("click", exportDecisions);
  document.querySelector("[data-import]")?.addEventListener("change", importDecisions);
  document.querySelector("[data-forget]")?.addEventListener("click", forgetDraft);
  render();

  function blank(org) {
    const decision = org.decision || {};
    return {
      primary_candidate_id: decision.primary_candidate_id || "",
      dark_candidate_id: decision.dark_candidate_id || "",
      historical: (decision.historical || []).map((item) => ({
        candidate_id: item.candidate_id,
        edition_ids: [...(item.edition_ids || [])],
      })),
      rejected_candidate_ids: [...(decision.rejected_candidate_ids || [])],
      needs_other: Boolean(decision.needs_other),
      priority: decision.priority || "",
      sort_order: Number.isInteger(decision.sort_order) ? decision.sort_order : null,
      comment: decision.comment || "",
      base_updated_at: decision.updated_at || "",
    };
  }

  function snapshot(decision) {
    return JSON.stringify({
      primary_candidate_id: decision.primary_candidate_id || "",
      dark_candidate_id: decision.dark_candidate_id || "",
      historical: decision.historical || [],
      rejected_candidate_ids: decision.rejected_candidate_ids || [],
      needs_other: Boolean(decision.needs_other),
      priority: decision.priority || "",
      sort_order: Number.isInteger(decision.sort_order) ? decision.sort_order : null,
      comment: decision.comment || "",
    });
  }

  function sameAsEmbedded(id) {
    const org = orgs.find((item) => item.organization_id === id);
    return snapshot(state.get(id)) === snapshot(blank(org));
  }

  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (!saved || !Array.isArray(saved.decisions)) return;
      for (const decision of saved.decisions) {
        if (!state.has(decision.organization_id)) continue;
        const current = state.get(decision.organization_id);
        state.set(decision.organization_id, {
          ...current,
          ...decision,
          historical: decision.historical || [],
          rejected_candidate_ids: decision.rejected_candidate_ids || [],
          base_updated_at: current.base_updated_at,
        });
        if (!sameAsEmbedded(decision.organization_id)) dirty.add(decision.organization_id);
      }
    } catch {
      /* черновик необязателен */
    }
  }

  function saveDraft() {
    const decisions = exportList();
    localStorage.setItem(draftKey, JSON.stringify({ saved_at: new Date().toISOString(), decisions }));
    const draftNote = document.querySelector("[data-draft]");
    if (draftNote) {
      draftNote.hidden = dirty.size === 0;
      draftNote.textContent = dirty.size
        ? `Сохранено в браузере: ${dirty.size}. В реестр это ещё не записано.`
        : "";
    }
    const exportNote = document.querySelector("[data-export-state]");
    if (exportNote) {
      const pending = exportedPendingIds();
      const onlyHere = [...dirty].filter((id) => !pending.has(id)).length;
      const parts = [];
      if (onlyHere) parts.push(`Только в браузере, ещё не экспортировано: ${onlyHere}.`);
      if (pending.size) parts.push(`Экспортировано, в реестре ещё не применено: ${pending.size}.`);
      if (!parts.length) parts.push("Открытый каталог совпадает с последней сборкой реестра.");
      exportNote.textContent = parts.join(" ");
    }
  }

  function exportList() {
    return orgs.map((org) => {
      const decision = state.get(org.organization_id);
      return { organization_id: org.organization_id, ...decision };
    });
  }

  function exportedPendingIds() {
    const pending = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(exportKey) || "null");
      if (!saved || !Array.isArray(saved.decisions)) return pending;
      for (const decision of saved.decisions) {
        if (!state.has(decision.organization_id) || sameAsEmbedded(decision.organization_id)) continue;
        const current = { ...state.get(decision.organization_id) };
        const exported = { ...decision };
        delete current.base_updated_at;
        delete exported.base_updated_at;
        delete exported.organization_id;
        if (snapshot(current) === snapshot(exported)) pending.add(decision.organization_id);
      }
    } catch {
      /* экспорт мог отсутствовать */
    }
    return pending;
  }

  function usableCandidates(org) {
    return (org.candidates || []).filter((item) => item.usable && item.prepared_path);
  }

  function needsClarify(org) {
    const decision = state.get(org.organization_id);
    if (decision.needs_other) return true;
    return (org.candidates || []).some((item) => item.ambiguity);
  }

  function statusOf(org) {
    const decision = state.get(org.organization_id);
    const files = usableCandidates(org);
    if (decision.needs_other) return "clarify";
    if (!files.length) return "missing";
    if (decision.primary_candidate_id) return "decided";
    if ((org.candidates || []).some((item) => item.ambiguity)) return "clarify";
    return "unsorted";
  }

  function matches(org) {
    const query = (document.querySelector("[data-search]")?.value || "").trim().toLowerCase();
    const edition = document.querySelector("[data-edition]")?.value || "";
    const filter = document.querySelector("[data-filter]")?.value || "all";
    if (query && !org.name.toLowerCase().includes(query) && !org.organization_id.includes(query)) return false;
    if (edition && !org.editions.some((item) => item.edition_id === edition)) return false;
    if (selectedOnly && !state.get(org.organization_id).primary_candidate_id) return false;
    const status = statusOf(org);
    if (filter === "all") return true;
    if (filter === "clarify") return needsClarify(org);
    return status === filter;
  }

  function render() {
    const visible = orgs.filter(matches);
    paintStats(visible);
    if (selectedOnly) {
      grid.innerHTML = "";
      selectedBox.classList.remove("hidden");
      selectedBox.innerHTML = selectedHtml(visible);
      bindSelected(selectedBox);
    } else {
      selectedBox.classList.add("hidden");
      selectedBox.innerHTML = "";
      grid.innerHTML = visible.map(cardHtml).join("") || "<p class='note'>Ничего не найдено.</p>";
      bindCards(grid);
    }
    saveDraft();
  }

  function paintStats(visible) {
    const counts = { unsorted: 0, decided: 0, missing: 0, clarify: 0 };
    for (const org of orgs) counts[statusOf(org)] += 1;
    const box = document.querySelector("[data-stats]");
    box.innerHTML = [
      ["показано", visible.length],
      ["не разобрано", counts.unsorted],
      ["выбор сделан", counts.decided],
      ["не найден", counts.missing],
      ["уточнение", counts.clarify],
    ].map(([label, value]) => `<span class="stat">${label}: ${value}</span>`).join("");
  }

  function asset(candidate) {
    return `${root}${candidate.prepared_path}`;
  }

  function plate(candidate, size) {
    const kind = candidate.plate === "dark" ? "dark" : candidate.plate === "light" ? "light" : "checker";
    return `<div class="plate ${size} ${kind}"><img alt="" src="${escapeAttr(asset(candidate))}"></div>`;
  }

  function oppositePlate(candidate) {
    const kind = candidate.plate === "dark" ? "light" : "dark";
    return `<div class="plate site ${kind}"><img alt="" src="${escapeAttr(asset(candidate))}"></div>`;
  }

  function cardHtml(org) {
    const decision = state.get(org.organization_id);
    const files = org.candidates || [];
    const editions = org.editions
      .map((edition) => {
        const partial = edition.host_list_status === "partial" ? " · список выпуска неполный" : "";
        const visit = edition.label ? ` · ${escapeHtml(edition.label)}` : "";
        return `<span class="chip">${escapeHtml(edition.adnomads_id)} · ${escapeHtml(edition.date_label)}${visit}${partial}</span>`;
      })
      .join("");
    const priority = ["", "first", "normal", "reserve"]
      .map((id) => {
        const label = data.priorities[id] || id;
        return `<label><input type="radio" name="priority-${org.organization_id}" data-priority value="${id}" ${decision.priority === id ? "checked" : ""}> ${escapeHtml(label)}</label>`;
      })
      .join("");
    const variants = files.length
      ? `<div class="variants">${files.map((candidate) => variantHtml(org, candidate, decision)).join("")}</div>`
      : `<p>Логотип не найден. На сайте можно показать название: <strong>${escapeHtml(org.name)}</strong>.</p>`;
    const distinction = org.distinction ? `<p class="note">${escapeHtml(org.distinction)}</p>` : "";
    const gaps = (org.gaps || []).map((gap) => `<p class="note">${escapeHtml(gap.note)}</p>`).join("");
    return `<article class="card" data-org="${escapeAttr(org.organization_id)}">
      <div class="head"><div><h2>${escapeHtml(org.name)}</h2><div class="editions">${editions}</div></div><span class="badge">${escapeHtml(statusLabel(statusOf(org)))}</span></div>
      ${distinction}
      ${gaps}
      <div class="priority" data-priority-group>${priority}</div>
      ${variants}
      <label class="check"><input data-needs type="checkbox" ${decision.needs_other ? "checked" : ""}> Нужен другой вариант</label>
      <textarea data-comment placeholder="Комментарий">${escapeHtml(decision.comment)}</textarea>
    </article>`;
  }

  function variantHtml(org, candidate, decision) {
    const source = sourceTypes.get(candidate.source_type) || { label: candidate.source_type, official: false };
    const rejected = decision.rejected_candidate_ids.includes(candidate.candidate_id);
    const historical = decision.historical.find((item) => item.candidate_id === candidate.candidate_id);
    const editionBoxes = org.editions
      .map((edition) => {
        const checked = historical?.edition_ids?.includes(edition.edition_id) ? "checked" : "";
        return `<label class="check"><input data-historical value="${escapeAttr(edition.edition_id)}" type="checkbox" ${checked}> ${escapeHtml(edition.adnomads_id)}</label>`;
      })
      .join("");
    const period = candidate.historical_period
      ? `<span class="badge warn">исторический вариант: ${escapeHtml(candidate.historical_period)}</span>`
      : "";
    const current = candidate.presumed_current === true ? "предположительно актуальный" : candidate.presumed_current === false ? "предположительно неактуальный" : "актуальность не утверждается";
    const raw = candidate.raw_path ? `<a href="${escapeAttr(root + candidate.raw_path)}" target="_blank" rel="noreferrer">исходник</a>` : "";
    const page = candidate.source_page ? `<a href="${escapeAttr(candidate.source_page)}" target="_blank" rel="noreferrer">страница</a>` : "";
    return `<div class="variant ${rejected ? "rejected" : ""}" data-candidate="${escapeAttr(candidate.candidate_id)}">
      <div class="plates">${candidate.usable ? `${plate(candidate, "large")}${plate(candidate, "site")}${oppositePlate(candidate)}` : `<p>Файл не подготовлен к показу. ${escapeHtml(candidate.prepare_note || "")}</p>`}</div>
      <div>
        <span class="badge ${source.official ? "official" : "side"}">${source.official ? "официальный" : "сторонний"}</span>
        <span class="badge">${escapeHtml(source.label || "")}</span>
        ${period}
      </div>
      <p>${escapeHtml(candidate.description || "Вариант без отдельного описания.")}</p>
      <p class="note">${escapeHtml(candidate.format || "")} ${candidate.width && candidate.height ? `· ${candidate.width}×${candidate.height}` : ""} · ${escapeHtml(candidate.retrieved_at || "")} · ${escapeHtml(current)}</p>
      ${candidate.ambiguity ? `<p class="note">${escapeHtml(candidate.ambiguity)}</p>` : ""}
      ${candidate.historical_basis ? `<p class="note">Основание периода: ${escapeHtml(candidate.historical_basis)}</p>` : ""}
      <p class="note">${page} ${raw}</p>
      <div class="actions">
        <label class="check"><input data-primary type="radio" name="primary-${org.organization_id}" ${decision.primary_candidate_id === candidate.candidate_id ? "checked" : ""} ${rejected ? "disabled" : ""}> Основной</label>
        <label class="check"><input data-dark type="radio" name="dark-${org.organization_id}" ${decision.dark_candidate_id === candidate.candidate_id ? "checked" : ""} ${rejected ? "disabled" : ""}> Для тёмного фона</label>
        <label class="check"><input data-reject type="checkbox" ${rejected ? "checked" : ""}> Отклонить</label>
      </div>
      <div class="actions">${editionBoxes}</div>
      <p class="note">Отметки выпусков сохраняют этот вариант как исторический для выбранных выпусков.</p>
    </div>`;
  }

  function selectedHtml(visible) {
    const groups = [
      ["first", "Первая группа показа"],
      ["normal", "Обычный показ"],
      ["reserve", "Резерв"],
      ["", "Приоритет не задан"],
    ];
    return groups
      .map(([id, title]) => {
        const items = visible
          .filter((org) => (state.get(org.organization_id).priority || "") === id && state.get(org.organization_id).primary_candidate_id)
          .sort((a, b) => {
            const left = state.get(a.organization_id).sort_order ?? 100000;
            const right = state.get(b.organization_id).sort_order ?? 100000;
            if (left !== right) return left - right;
            return a.name.localeCompare(b.name, "ru");
          });
        if (!items.length) return "";
        const cells = (background) =>
          items
            .map((org) => {
              const decision = state.get(org.organization_id);
              const candidate = (org.candidates || []).find((item) => item.candidate_id === (background === "dark" && decision.dark_candidate_id ? decision.dark_candidate_id : decision.primary_candidate_id));
              if (!candidate) return `<div class="cell"><span class="textname">${escapeHtml(org.name)}</span></div>`;
              return `<div class="cell" title="${escapeAttr(org.name)}"><img alt="${escapeAttr(org.name)}" src="${escapeAttr(asset(candidate))}"></div>`;
            })
            .join("");
        const orders = items
          .map((org) => {
            const decision = state.get(org.organization_id);
            return `<label class="check">${escapeHtml(org.name)} <input data-order data-org="${escapeAttr(org.organization_id)}" type="number" min="1" step="1" value="${decision.sort_order ?? ""}" placeholder="порядок"></label>`;
          })
          .join("");
        return `<section class="card"><h2>${escapeHtml(title)}</h2><p class="note">Светлая полоса</p><div class="strip light">${cells("light")}</div><p class="note">Тёмная полоса. Если выбрана отдельная версия для тёмного фона, здесь она.</p><div class="strip dark">${cells("dark")}</div><div class="priority">${orders}</div></section>`;
      })
      .join("");
  }

  function bindCards(scope) {
    scope.querySelectorAll("[data-org]").forEach((card) => {
      const id = card.getAttribute("data-org");
      const decision = state.get(id);
      card.querySelectorAll("[data-priority]").forEach((input) => {
        input.addEventListener("change", () => {
          if (!input.checked) return;
          decision.priority = input.value;
          touch(id);
        });
      });
      const needs = card.querySelector("[data-needs]");
      needs?.addEventListener("change", () => {
        decision.needs_other = needs.checked;
        touch(id);
      });
      const comment = card.querySelector("[data-comment]");
      comment?.addEventListener("input", () => {
        decision.comment = comment.value;
        touch(id);
      });
      card.querySelectorAll("[data-candidate]").forEach((node) => {
        const candidateId = node.getAttribute("data-candidate");
        node.querySelector("[data-primary]")?.addEventListener("change", (event) => {
          if (!event.target.checked) return;
          decision.primary_candidate_id = candidateId;
          decision.rejected_candidate_ids = decision.rejected_candidate_ids.filter((item) => item !== candidateId);
          touch(id);
          render();
        });
        node.querySelector("[data-dark]")?.addEventListener("change", (event) => {
          if (!event.target.checked) return;
          decision.dark_candidate_id = candidateId;
          touch(id);
        });
        node.querySelector("[data-reject]")?.addEventListener("change", (event) => {
          if (event.target.checked) {
            if (!decision.rejected_candidate_ids.includes(candidateId)) decision.rejected_candidate_ids.push(candidateId);
            if (decision.primary_candidate_id === candidateId) decision.primary_candidate_id = "";
            if (decision.dark_candidate_id === candidateId) decision.dark_candidate_id = "";
          } else {
            decision.rejected_candidate_ids = decision.rejected_candidate_ids.filter((item) => item !== candidateId);
          }
          touch(id);
          render();
        });
        node.querySelectorAll("[data-historical]").forEach((box) => {
          box.addEventListener("change", () => {
            const editionId = box.value;
            let entry = decision.historical.find((item) => item.candidate_id === candidateId);
            if (!entry) {
              entry = { candidate_id: candidateId, edition_ids: [] };
              decision.historical.push(entry);
            }
            if (box.checked && !entry.edition_ids.includes(editionId)) entry.edition_ids.push(editionId);
            if (!box.checked) entry.edition_ids = entry.edition_ids.filter((item) => item !== editionId);
            decision.historical = decision.historical.filter((item) => item.edition_ids.length);
            touch(id);
          });
        });
      });
    });
  }

  function bindSelected(scope) {
    scope.querySelectorAll("[data-order]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.getAttribute("data-org");
        const decision = state.get(id);
        const value = input.value.trim();
        decision.sort_order = value ? Number(value) : null;
        if (!Number.isInteger(decision.sort_order)) decision.sort_order = null;
        touch(id);
        render();
      });
    });
  }

  function touch(id) {
    if (sameAsEmbedded(id)) dirty.delete(id);
    else dirty.add(id);
    saveDraft();
  }

  function exportDecisions() {
    const decisions = exportList().filter((decision) => {
      const empty = snapshot(decision) === snapshot(blank({ decision: {} }));
      return !empty || dirty.has(decision.organization_id);
    });
    const payload = {
      schema: "moscow-logos-decisions/v1",
      exported_at: new Date().toISOString(),
      registry_version: data.registry_version,
      decisions,
    };
    localStorage.setItem(exportKey, JSON.stringify({ exported_at: payload.exported_at, decisions }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logos-decisions.json";
    link.click();
    URL.revokeObjectURL(link.href);
    saveDraft();
  }

  function importDecisions(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const decisions = Array.isArray(parsed) ? parsed : parsed.decisions;
        if (!Array.isArray(decisions)) return;
        for (const decision of decisions) {
          if (!state.has(decision.organization_id)) continue;
          const current = state.get(decision.organization_id);
          state.set(decision.organization_id, {
            ...current,
            ...decision,
            historical: decision.historical || [],
            rejected_candidate_ids: decision.rejected_candidate_ids || [],
            base_updated_at: current.base_updated_at,
          });
          if (!sameAsEmbedded(decision.organization_id)) dirty.add(decision.organization_id);
          else dirty.delete(decision.organization_id);
        }
        render();
      } catch {
        /* битый файл не применяется */
      }
    };
    reader.readAsText(file);
  }

  function forgetDraft() {
    localStorage.removeItem(draftKey);
    dirty.clear();
    for (const org of orgs) state.set(org.organization_id, blank(org));
    render();
  }

  function statusLabel(status) {
    return {
      unsorted: "ещё не разобрано",
      decided: "выбор сделан",
      missing: "логотип не найден",
      clarify: "требуется уточнение",
    }[status] || status;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }
})();
