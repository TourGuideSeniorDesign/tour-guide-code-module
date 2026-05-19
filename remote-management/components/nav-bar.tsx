"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const links = [
  { href: "/", label: "Status" },
  { href: "/logs", label: "Logs" },
  { href: "/management", label: "Management" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1">
      <nav className="flex items-center gap-1">
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-(--color-secondary) text-(--color-foreground)"
                  : "text-(--color-muted-foreground) hover:bg-(--color-accent) hover:text-(--color-foreground)",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-3 h-6 w-px bg-(--color-border)" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onLogout}
        className="ml-1 text-(--color-muted-foreground)"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
