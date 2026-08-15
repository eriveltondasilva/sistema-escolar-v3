/// <reference types="google-apps-script" />
import type { Alpine as AlpineType } from "alpinejs";

declare global {
  var Alpine: AlpineType;

  var google: {
    script: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      run: Record<string, any>;
      host: {
        close(): void;
      };
    };
  };
}

export {};
