import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { ISSUES_URL } from "@/lib/github";

const SLUG = "languages";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "available", title: "Available languages" },
  { id: "choosing", title: "Choosing a language" },
  { id: "not-translated", title: "What isn't translated" },
  { id: "translation-quality", title: "Translation quality" },
];

const LANGUAGES = [
  { code: "en", english: "English", native: "English" },
  { code: "fr", english: "French", native: "Français" },
  { code: "de", english: "German", native: "Deutsch" },
  { code: "it", english: "Italian", native: "Italiano" },
  { code: "es-ES", english: "Spanish (Spain)", native: "Español (España)" },
  { code: "es-419", english: "Spanish (Latin America)", native: "Español (Latinoamérica)" },
  { code: "pt-PT", english: "Portuguese (Portugal)", native: "Português (Portugal)" },
  { code: "pt-BR", english: "Portuguese (Brazil)", native: "Português (Brasil)" },
];

export default function LanguagesPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <h2 id="available">Available languages</h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table>
          <thead>
            <tr>
              <th scope="col">Language</th>
              <th scope="col">Shown in the app as</th>
            </tr>
          </thead>
          <tbody>
            {LANGUAGES.map((language) => (
              <tr key={language.english}>
                <td>{language.english}</td>
                <td>
                  <span lang={language.code}>{language.native}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The language applies to the operator dashboard and to the on-air graphics, such as
        &quot;First Half&quot;, &quot;Penalties&quot; and the goal banner.
      </p>

      <h2 id="choosing">Choosing a language</h2>
      <p>
        The first time PlayOverlay opens, it suggests a language based on your system and asks you
        to confirm it or pick another. If you close the prompt without choosing, it asks again next
        time.
      </p>
      <p>
        To change it later, open <strong>System Settings → Language</strong>. The change applies
        straight away to the dashboard and the graphics.
      </p>

      <h2 id="not-translated">What isn&apos;t translated</h2>
      <ul>
        <li>
          Anything you type yourself: team names, abbreviations, venues, period names, and the
          titles of saved match settings and custom graphics. These always appear exactly as you
          entered them.
        </li>
        <li>
          The <Link href="/docs/phone-remote">phone remote</Link>, which is English only for now.
        </li>
      </ul>

      <h2 id="translation-quality">Translation quality</h2>
      <Callout tone="warning">
        <p>
          The translations are machine-generated and haven&apos;t been checked by native speakers
          yet, so some wording may read a little oddly, especially the football terms on air. If
          you spot a mistake, please <a href={ISSUES_URL}>open an issue on GitHub</a> with the
          wording you would expect, and it will be fixed.
        </p>
      </Callout>
    </DocPage>
  );
}
