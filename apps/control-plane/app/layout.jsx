import "./globals.css";

export const metadata = {
  title: "AI-OS Mission Control",
  description: "Advanced Visualization Panel for Personal AI Operating System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900 bg-white">
        {children}
      </body>
    </html>
  );
}
