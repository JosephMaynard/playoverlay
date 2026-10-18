import Link from "next/link";
import { REPO_URL } from "@/lib/github";
import { KOFI_URL } from "@/lib/site";
import { ChevronDownIcon } from "@/components/icons";
import { eyebrow, sectionTitle, textLink } from "@/lib/ui";

interface Question {
  question: string;
  answer: React.ReactNode;
}

const QUESTIONS: Question[] = [
  {
    question: "Is PlayOverlay free?",
    answer: (
      <>
        <p>
          Yes. There is no paid version, no account, no watermark and no time limit, and you can use
          it for paid or commercial streams. If it earns a place in your kit bag you can{" "}
          <a href={KOFI_URL} className={textLink}>
            support its development on Ko-fi
          </a>
          , but nothing is held back for supporters.
        </p>
      </>
    ),
  },
  {
    question: "Is it open source?",
    answer: (
      <p>
        Yes, under the MIT licence. The{" "}
        <a href={REPO_URL} className={textLink}>
          source code is on GitHub
        </a>
        , where you can read it, report problems, build it yourself or send a pull request. The
        PlayOverlay name and logo belong to Magic Zebra Ltd and aren&apos;t covered by the licence,
        so a fork needs its own name.
      </p>
    ),
  },
  {
    question: "Which operating systems does it run on?",
    answer: (
      <p>
        Windows, macOS (Apple Silicon and Intel) and Linux, with .deb packages for Debian and Ubuntu
        and .rpm packages for Fedora and RHEL. The builds aren&apos;t code-signed, so your computer
        will warn you the first time you open the app.{" "}
        <Link href="/download#first-launch" className={textLink}>
          Here is how to get past that
        </Link>
        .
      </p>
    ),
  },
  {
    question: "Does it need an internet connection?",
    answer: (
      <p>
        No. The graphics are drawn on your computer. The OBS browser source stays on that computer,
        and the phone remote only needs a local wifi network, not the internet. The one thing
        PlayOverlay does online is check GitHub for a newer version when it starts. It has no
        telemetry and no crash reporting.
      </p>
    ),
  },
  {
    question: "Will it work with my mixer?",
    answer: (
      <p>
        If your mixer can take a computer&apos;s HDMI output on one input and chroma key it over a
        camera, yes. The Blackmagic ATEM Mini range is a common choice: the laptop plugs into one of
        its HDMI inputs like any other source. If you stream from OBS without a hardware mixer, use
        the browser source instead and skip keying altogether.
      </p>
    ),
  },
  {
    question: "How do I key it?",
    answer: (
      <p>
        PlayOverlay draws its graphics on a solid colour, blue by default. On your mixer, set up a
        chroma key on the input carrying PlayOverlay, pick that colour, and put the key on air over
        your camera. On an ATEM Mini that means setting Upstream Key 1 to Chroma. If a team plays in
        blue, change the key colour to one neither team wears. The{" "}
        <Link href="/docs/output-setup#chroma-key" className={textLink}>
          output setup guide
        </Link>{" "}
        goes through it step by step.
      </p>
    ),
  },
  {
    question: "Can I use it for sports other than football?",
    answer: (
      <p>
        Yes. Switch the timer to generic mode and set the number and length of periods, for example
        four 12-minute quarters. The score bug, scoreboard and outputs work the same for any sport.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="border-t border-line bg-subtle py-20 sm:py-24">
      <div className="page-container grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <div>
          <p className={eyebrow}>Questions</p>
          <h2 id="faq-title" className={`mt-3 ${sectionTitle}`}>
            Frequently asked
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Something not covered here? The{" "}
            <Link href="/docs" className={textLink}>
              guide
            </Link>{" "}
            goes into more detail.
          </p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {QUESTIONS.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-fg [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon className="h-5 w-5 flex-none text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="pb-6 pr-8 leading-relaxed text-muted">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
