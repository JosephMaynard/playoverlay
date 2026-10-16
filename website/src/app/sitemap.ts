import type { MetadataRoute } from "next";
import { DOC_PAGES, docHref } from "@/lib/docs-nav";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/download", "/docs", ...DOC_PAGES.map((page) => docHref(page.slug))];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
