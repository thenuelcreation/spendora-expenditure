import "../src/App.css";

export const metadata = {
  title: "Spendora — Track. Manage. Export.",
  description: "Record expenditures, understand spending, and export your records with Spendora.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
