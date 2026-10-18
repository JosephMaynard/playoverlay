import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { DocsNavList } from "@/components/docs/docs-nav-list";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-container">
      <DocsMobileNav />
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <nav
            aria-label="Guide"
            className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-2"
          >
            <DocsNavList />
          </nav>
        </aside>
        <div className="min-w-0 py-10 lg:py-12">{children}</div>
      </div>
    </div>
  );
}
