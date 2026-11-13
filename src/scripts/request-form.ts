import { goals } from "../content/analytics";
import { reachGoal } from "./analytics";

const form = document.getElementById("moscow-request") as HTMLFormElement | null;
const submitButton = document.getElementById("moscow-request-submit") as HTMLButtonElement | null;
const attemptField = document.getElementById("moscow-attempt-id") as HTMLInputElement | null;
const statusEl = document.getElementById("moscow-form-status");
const contactInput = document.getElementById("moscow-request-contact") as HTMLInputElement | null;
const contactLabel = document.getElementById("moscow-contact-label");
const formComment = document.getElementById("moscow-form-comment") as HTMLDetailsElement | null;

type ChannelMeta = {
  fieldLabel: string;
  placeholder: string;
  autocomplete: string;
  inputMode: string;
};

const FIELD_ERRORS: Record<string, string> = {
  name: "Напишите имя.",
  channel: "Выберите способ связи.",
  contact: "Напишите, как с вами связаться.",
  notes: "Сократите комментарий.",
  attempt_id: "Не удалось подготовить заявку. Обновите страницу.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ATTEMPT_KEY = "moscow-request-attempt";
const DEFAULT_CHANNEL = "telegram";

function readChannelMeta(): Record<string, ChannelMeta> {
  const raw = form?.dataset.channels;
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, ChannelMeta>;
  } catch {
    return {};
  }
}

const channelMeta = readChannelMeta();

function selectedChannel(): string {
  const checked = form?.querySelector<HTMLInputElement>('input[name="channel"]:checked');
  return checked?.value || DEFAULT_CHANNEL;
}

function applyChannelMeta(channel = selectedChannel()): void {
  const meta = channelMeta[channel];
  if (!meta || !contactInput) {
    return;
  }
  if (contactLabel) {
    contactLabel.textContent = meta.fieldLabel;
  }
  contactInput.setAttribute("aria-label", meta.fieldLabel);
  contactInput.placeholder = meta.placeholder;
  contactInput.autocomplete = meta.autocomplete;
  contactInput.inputMode = meta.inputMode as HTMLInputElement["inputMode"];
  contactInput.type = channel === "email" ? "email" : "text";
}

function resetFormDefaults(): void {
  const telegram = form?.querySelector<HTMLInputElement>('input[name="channel"][value="telegram"]');
  if (telegram) {
    telegram.checked = true;
  }
  const trip = form?.querySelector<HTMLInputElement>('input[name="trip"]');
  if (trip) {
    trip.value = "moscow";
  }
  applyChannelMeta(DEFAULT_CHANNEL);
  if (formComment) {
    formComment.open = false;
  }
}

function digitCount(value: string): number {
  return (value.match(/\d/g) || []).length;
}

function validateContact(channel: string, value: string): string | null {
  if (!value) {
    return "Напишите, как с вами связаться.";
  }
  if (value.length > 500) {
    return "Сократите это поле.";
  }
  if (channel === "email") {
    return EMAIL_PATTERN.test(value) ? null : "Нужен адрес почты.";
  }
  if (channel === "phone") {
    if (digitCount(value) < 7 || !/^[+\d][\d\s()./-]*$/.test(value)) {
      return "Нужен телефон с кодом страны.";
    }
  }
  return null;
}

function setStatus(message: string, kind: "success" | "error" | ""): void {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.remove("form-status--success", "form-status--error");
  if (kind) {
    statusEl.classList.add(kind === "success" ? "form-status--success" : "form-status--error");
  }
}

function clearFieldErrors(): void {
  form?.querySelectorAll(".field.is-invalid").forEach((field) => field.classList.remove("is-invalid"));
  form?.querySelectorAll<HTMLElement>("[data-error-for]").forEach((el) => {
    el.hidden = true;
    el.textContent = "";
  });
  form?.querySelectorAll("[aria-invalid='true']").forEach((el) => el.removeAttribute("aria-invalid"));
}

function markFieldError(name: string, message?: string): void {
  const named = form?.elements.namedItem(name);
  let input: HTMLElement | null = null;
  if (named instanceof HTMLElement) {
    input = named;
  } else if (named instanceof RadioNodeList) {
    const checked = Array.from(named).find(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.checked,
    );
    input = checked ?? (named[0] instanceof HTMLElement ? named[0] : null);
  }
  if (!input) {
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.closest(".field")?.classList.add("is-invalid");
  const errorEl = form?.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  if (errorEl) {
    errorEl.textContent = message || FIELD_ERRORS[name] || "Проверьте это поле.";
    errorEl.hidden = false;
  }
}

function validateRequestForm(): boolean {
  let valid = true;
  const nameInput = form?.elements.namedItem("name");
  if (nameInput instanceof HTMLInputElement) {
    const name = nameInput.value.trim();
    if (!name || name.length > 120) {
      markFieldError("name", FIELD_ERRORS.name);
      valid = false;
    }
  }
  const channel = selectedChannel();
  if (!channelMeta[channel]) {
    markFieldError("channel");
    valid = false;
  }
  const contactError = validateContact(channel, contactInput?.value.trim() ?? "");
  if (contactError) {
    markFieldError("contact", contactError);
    valid = false;
  }
  const notes = form?.elements.namedItem("notes");
  if (notes instanceof HTMLTextAreaElement && notes.value.length > 4000) {
    markFieldError("notes");
    valid = false;
  }
  return valid;
}

function newAttemptId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `a-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentAttemptId(): string {
  let id = sessionStorage.getItem(ATTEMPT_KEY);
  if (!id) {
    id = newAttemptId();
    sessionStorage.setItem(ATTEMPT_KEY, id);
  }
  return id;
}

function resetAttemptId(): void {
  const id = newAttemptId();
  sessionStorage.setItem(ATTEMPT_KEY, id);
  if (attemptField) {
    attemptField.value = id;
  }
}

if (form && attemptField) {
  attemptField.value = currentAttemptId();
  applyChannelMeta();
  form.querySelectorAll<HTMLInputElement>('input[name="channel"]').forEach((input) => {
    input.addEventListener("change", () => applyChannelMeta());
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!submitButton) {
      return;
    }
    clearFieldErrors();
    if (!validateRequestForm()) {
      form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      setStatus(form.dataset.invalid ?? "Проверьте отмеченные поля.", "error");
      return;
    }
    const submitLabel = form.dataset.submitLabel ?? "Отправить заявку";
    submitButton.disabled = true;
    submitButton.textContent = form.dataset.sending ?? "Отправляем…";
    setStatus("", "");
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; duplicate?: boolean; fields?: string[] }
        | null;
      if (response.ok && data?.ok) {
        setStatus(form.dataset.success ?? "Заявка сохранена.", "success");
        if (!data.duplicate) {
          reachGoal(goals.leadApplication);
          resetAttemptId();
          form.reset();
          resetFormDefaults();
          if (attemptField) {
            attemptField.value = currentAttemptId();
          }
        }
        return;
      }
      if (Array.isArray(data?.fields)) {
        data.fields.forEach((name) => markFieldError(name));
        form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      }
      setStatus(form.dataset.error ?? "Не удалось сохранить заявку.", "error");
    } catch {
      setStatus(form.dataset.network ?? "Не удалось связаться с сервером.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });
}
