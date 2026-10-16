import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="page-container py-24 text-center sm:py-32">
      <p className="text-sm font-semibold text-accent-text">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        This page isn&apos;t here
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
        The link may be old, or the page may have moved into the guide.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className={buttonPrimary}>
          Go to the home page
        </Link>
        <Link href="/docs" className={buttonSecondary}>
          Open the guide
        </Link>
      </div>
    </div>
  );
}
