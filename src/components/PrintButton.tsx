"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
    >
      Afdrukken / Opslaan als PDF
    </button>
  );
}
