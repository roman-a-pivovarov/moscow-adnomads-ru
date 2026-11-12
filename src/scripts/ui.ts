import { goals } from "../content/analytics";
import { initAnalytics, reachGoal } from "./analytics";

const menuToggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const mobileNav = document.querySelector<HTMLElement>("[data-mobile-nav]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let menuOpen = false;
let menuLastFocus: HTMLElement | null = null;

function menuFocusables(): HTMLElement[] {
  if (!mobileNav) {
    return [];
  }
  return Array.from(
    mobileNav.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
  ).filter((el) => !el.hasAttribute("disabled"));
}

function setMenuOpen(open: boolean): void {
  if (!menuToggle || !mobileNav) {
    return;
  }
  menuOpen = open;
  mobileNav.classList.toggle("is-open", open);
  mobileNav.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  document.body.classList.toggle("is-menu-open", open);
  if (open) {
    menuLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : menuToggle;
    const links = menuFocusables();
    window.requestAnimationFrame(() => {
      (links[0] ?? menuToggle).focus();
    });
  } else if (menuLastFocus) {
    menuLastFocus.focus({ preventScroll: true });
    menuLastFocus = null;
  }
}

menuToggle?.addEventListener("click", () => {
  setMenuOpen(!menuOpen);
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (!menuOpen) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    setMenuOpen(false);
    return;
  }
  if (event.key !== "Tab" || !mobileNav || !menuToggle) {
    return;
  }
  const focusables = [menuToggle, ...menuFocusables()];
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
});

document.querySelectorAll<HTMLElement>("[data-exclusive-details]").forEach((group) => {
  const items = Array.from(group.querySelectorAll<HTMLDetailsElement>(":scope > details"));
  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) {
        return;
      }
      items.forEach((other) => {
        if (other !== item) {
          other.open = false;
        }
      });
    });
  });
});

document.querySelectorAll<HTMLElement>("[data-show-more]").forEach((list) => {
  const toggle = list.parentElement?.querySelector<HTMLButtonElement>("[data-show-more-toggle]");
  if (!toggle) {
    return;
  }
  const more = toggle.dataset.labelMore ?? "Показать ещё";
  const less = toggle.dataset.labelLess ?? "Свернуть";
  toggle.addEventListener("click", () => {
    const expanded = list.classList.toggle("is-expanded");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? less : more;
  });
});

const heroSlides = Array.from(document.querySelectorAll<HTMLImageElement>("[data-hero-slide]"));
let heroSlideIndex = 0;
let heroTimer: number | undefined;

function showNextHeroSlide(): void {
  if (document.hidden || heroSlides.length < 2) {
    return;
  }
  const nextIndex = (heroSlideIndex + 1) % heroSlides.length;
  const current = heroSlides[heroSlideIndex];
  const next = heroSlides[nextIndex];
  current.classList.add("is-outgoing");
  current.classList.remove("is-active");
  current.setAttribute("aria-hidden", "true");
  next.classList.add("is-active");
  next.classList.remove("is-outgoing");
  next.removeAttribute("aria-hidden");
  window.setTimeout(() => current.classList.remove("is-outgoing"), 1000);
  heroSlideIndex = nextIndex;
}

function startHeroSlideshow(): void {
  window.clearInterval(heroTimer);
  if (heroSlides.length < 2 || reduceMotion.matches) {
    return;
  }
  heroTimer = window.setInterval(showNextHeroSlide, 2000);
}

heroSlides.forEach((slide, index) => {
  slide.classList.toggle("is-active", index === 0);
  if (index !== 0) {
    slide.setAttribute("aria-hidden", "true");
  }
});
reduceMotion.addEventListener("change", startHeroSlideshow);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearInterval(heroTimer);
    return;
  }
  startHeroSlideshow();
});
startHeroSlideshow();

function initPhotoStrip(root: HTMLElement): void {
  const viewport = root.querySelector<HTMLElement>("[data-strip-viewport]");
  const track = root.querySelector<HTMLElement>("[data-strip-track]");
  const prevBtn = root.querySelector<HTMLButtonElement>("[data-strip-prev]");
  const nextBtn = root.querySelector<HTMLButtonElement>("[data-strip-next]");
  const toggleBtn = root.querySelector<HTMLButtonElement>("[data-strip-toggle]");
  if (!viewport || !track || !prevBtn || !nextBtn || !toggleBtn) {
    return;
  }

  const originalSlides = Array.from(track.querySelectorAll<HTMLElement>("[data-strip-slide]"));
  const slideCount = originalSlides.length;
  if (slideCount < 2) {
    return;
  }

  const AUTO_MS = 1500;
  const FIRST_MS = 500;
  const TRANSITION_MS = 400;
  const SWIPE_THRESHOLD = 40;
  const mobileManualMq = window.matchMedia("(max-width: 899px)");
  const isManualSection = root.classList.contains("photo-strip--manual-mobile");

  function isManualMobile(): boolean {
    return isManualSection && mobileManualMq.matches;
  }

  let index = slideCount;
  let userPaused = isManualMobile();
  let hoverPaused = false;
  let focusPaused = false;
  let inView = false;
  let animating = false;
  let useFirstDelay = true;
  let moveStartedAt = 0;
  let autoTimer: number | undefined;
  let settleTimer: number | undefined;
  let dragStartX: number | null = null;
  let dragDelta = 0;

  function cloneSlide(slide: HTMLElement): HTMLElement {
    const clone = slide.cloneNode(true) as HTMLElement;
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("data-strip-slide");
    clone.querySelectorAll("img").forEach((img) => {
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
    });
    return clone;
  }

  const leading = document.createDocumentFragment();
  const trailing = document.createDocumentFragment();
  originalSlides.forEach((slide) => {
    leading.appendChild(cloneSlide(slide));
    trailing.appendChild(cloneSlide(slide));
  });
  track.prepend(leading);
  track.append(trailing);

  function gapSize(): number {
    const styles = getComputedStyle(track);
    return Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
  }

  function fullCount(): number {
    const raw = getComputedStyle(root).getPropertyValue("--strip-full").trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  function peekSize(): number {
    const slide = track.querySelector<HTMLElement>(".photo-strip__slide");
    if (!slide) {
      return 0;
    }
    const full = fullCount();
    const gap = gapSize();
    const slideW = slide.getBoundingClientRect().width;
    return Math.max(0, (viewport.clientWidth - slideW * full - gap * (full + 1)) / 2);
  }

  function stepSize(): number {
    const slide = track.querySelector<HTMLElement>(".photo-strip__slide");
    if (!slide) {
      return 0;
    }
    return slide.getBoundingClientRect().width + gapSize();
  }

  function setTransform(instant: boolean): void {
    const offset = Math.max(0, index * stepSize() - peekSize() - gapSize());
    if (instant || reduceMotion.matches) {
      root.classList.add("is-instant");
      track.style.transform = `translate3d(-${offset}px, 0, 0)`;
      void track.offsetWidth;
      root.classList.remove("is-instant");
      return;
    }
    track.style.transform = `translate3d(-${offset}px, 0, 0)`;
  }

  function syncToggleUi(): void {
    root.classList.toggle("is-paused", userPaused);
    toggleBtn.setAttribute("aria-pressed", String(userPaused));
    toggleBtn.setAttribute(
      "aria-label",
      userPaused ? "Продолжить автоматическую смену" : "Остановить автоматическую смену",
    );
  }

  function canAutoplay(): boolean {
    return (
      !isManualMobile() &&
      !reduceMotion.matches &&
      !userPaused &&
      !hoverPaused &&
      !focusPaused &&
      inView &&
      !document.hidden
    );
  }

  function stopAutoplay(): void {
    window.clearTimeout(autoTimer);
    autoTimer = undefined;
  }

  function scheduleAutoplay(delay?: number): void {
    stopAutoplay();
    if (!canAutoplay()) {
      return;
    }
    const wait = delay ?? (useFirstDelay ? FIRST_MS : AUTO_MS);
    autoTimer = window.setTimeout(() => {
      if (!canAutoplay() || animating) {
        return;
      }
      useFirstDelay = false;
      go(1, false);
    }, wait);
  }

  function normalizeIndex(): void {
    if (index >= slideCount * 2) {
      index -= slideCount;
      setTransform(true);
    } else if (index < slideCount) {
      index += slideCount;
      setTransform(true);
    }
  }

  function finishMove(): void {
    if (!animating) {
      return;
    }
    normalizeIndex();
    animating = false;
    if (!canAutoplay()) {
      return;
    }
    const elapsed = moveStartedAt ? performance.now() - moveStartedAt : TRANSITION_MS;
    scheduleAutoplay(Math.max(0, AUTO_MS - elapsed));
  }

  function go(delta: number, fromUser: boolean): void {
    if (animating) {
      return;
    }
    if (fromUser) {
      userPaused = true;
      syncToggleUi();
      stopAutoplay();
      reachGoal(goals.interestPhoto);
    }
    index += delta;
    if (reduceMotion.matches) {
      setTransform(true);
      normalizeIndex();
      return;
    }
    animating = true;
    moveStartedAt = performance.now();
    setTransform(false);
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(finishMove, TRANSITION_MS + 80);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !inView) {
        useFirstDelay = true;
      }
      inView = visible;
      if (!inView) {
        stopAutoplay();
        return;
      }
      scheduleAutoplay();
    },
    { threshold: 0.15 },
  );
  observer.observe(root);

  prevBtn.addEventListener("click", () => go(-1, true));
  nextBtn.addEventListener("click", () => go(1, true));
  toggleBtn.addEventListener("click", () => {
    if (isManualMobile()) {
      return;
    }
    userPaused = !userPaused;
    syncToggleUi();
    if (userPaused) {
      stopAutoplay();
      return;
    }
    scheduleAutoplay(AUTO_MS);
  });
  root.addEventListener("pointerenter", () => {
    hoverPaused = true;
    stopAutoplay();
  });
  root.addEventListener("pointerleave", () => {
    hoverPaused = false;
    scheduleAutoplay(AUTO_MS);
  });
  root.addEventListener("focusin", () => {
    focusPaused = true;
    stopAutoplay();
  });
  root.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !root.contains(next)) {
      focusPaused = false;
      scheduleAutoplay(AUTO_MS);
    }
  });
  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    dragStartX = event.clientX;
    dragDelta = 0;
    viewport.classList.add("is-dragging");
  });
  viewport.addEventListener("pointermove", (event) => {
    if (dragStartX === null) {
      return;
    }
    dragDelta = event.clientX - dragStartX;
  });
  const endDrag = () => {
    if (dragStartX === null) {
      return;
    }
    viewport.classList.remove("is-dragging");
    const delta = dragDelta;
    dragStartX = null;
    dragDelta = 0;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      go(delta < 0 ? 1 : -1, true);
    }
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1, true);
    }
  });
  track.addEventListener("transitionend", (event) => {
    if (event.target === track && event.propertyName === "transform") {
      finishMove();
    }
  });
  window.addEventListener("resize", () => {
    if (isManualMobile()) {
      userPaused = true;
      stopAutoplay();
    }
    syncToggleUi();
    root.style.setProperty("--strip-viewport-w", `${viewport.clientWidth}px`);
    setTransform(true);
  });

  if (reduceMotion.matches) {
    userPaused = true;
  }
  syncToggleUi();
  root.style.setProperty("--strip-viewport-w", `${viewport.clientWidth}px`);
  setTransform(true);
  scheduleAutoplay();
}

document.querySelectorAll<HTMLElement>("[data-photo-strip]").forEach((root) => initPhotoStrip(root));
initAnalytics();
