import { Bot } from "lucide-react";
import { NavBar } from "../../components/nav-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-(--color-background)">
      <header className="border-b border-(--color-border) bg-(--color-card)">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary)/10">
              <Bot className="h-5 w-5 text-(--color-primary)" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">
                Autogiro Tour Guide
              </h1>
              <p className="mt-0.5 text-xs text-(--color-muted-foreground)">
                Remote Management
              </p>
            </div>
          </div>
          <NavBar />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-(--color-border) px-6 py-3">
        <p className="text-center text-xs text-(--color-muted-foreground)">
          AUTOGIRO
        </p>
      </footer>
    </div>
  );
}
