// The polyfilled browser build of docx-templates ships its types as lib/bundled.d.ts.
declare module 'docx-templates/lib/browser.js' {
  export * from 'docx-templates/lib/bundled';
}
