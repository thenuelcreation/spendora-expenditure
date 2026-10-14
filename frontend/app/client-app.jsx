"use client";

import dynamic from "next/dynamic";

const SpendoraApp = dynamic(() => import("../src/App.jsx"), {
  ssr: false,
  loading: () => <main className="auth-loading">Loading Spendora…</main>,
});

export default function ClientApp() {
  return <SpendoraApp />;
}
