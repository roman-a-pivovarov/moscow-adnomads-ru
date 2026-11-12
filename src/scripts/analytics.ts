import { metrikaCounterId } from "../content/analytics";

type Ym = (counterId: number, method: "reachGoal", goal: string) => void;

let listening = false;

export function reachGoal(goal: string): void {
  const ym = (window as Window & { ym?: Ym }).ym;
  if (typeof ym !== "function") {
    return;
  }
  ym(metrikaCounterId, "reachGoal", goal);
}

/** Слушает data-goal. Повторный вызов не вешает второй обработчик и не инициализирует счётчик. */
export function initAnalytics(): void {
  if (listening) {
    return;
  }
  listening = true;
  document.addEventListener("click", (event) => {
    const source = event.target instanceof Element ? event.target : null;
    const goal = source?.closest("[data-goal]")?.getAttribute("data-goal");
    if (!goal) {
      return;
    }
    reachGoal(goal);
  });
}
