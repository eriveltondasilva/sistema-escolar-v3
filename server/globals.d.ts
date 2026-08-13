/// <reference types="google-apps-script" />

declare global {
  var google: {
    script: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      run: Record<string, any>;
      host: {
        close(): void;
        setHeight(height: number): void;
        setWidth(width: number): void;
      };
    };
  };
}

export {};
