// client/utils/parse-init-data.ts

/**
 * Lê e parseia o `data-init` injetado pelo server (renderView).
 * Lança erro cedo se o atributo estiver ausente ou for JSON inválido,
 * em vez de deixar o Alpine quebrar depois com undefined.
 */
export function parseInitData<T = string>(el: HTMLElement): T {
  const raw = el.dataset.init;

  if (!raw) {
    throw new Error(
      `data-init ausente em <${el.tagName.toLowerCase()}>. ` +
        "Verifique se o server passou initData para renderView().",
    );
  }

  return JSON.parse(raw) as T;
}
