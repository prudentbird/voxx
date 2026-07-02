import type { Metadata } from "next";
import { ProsePage } from "~/components/prose-page";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch about Voxx. Report bugs and request features on GitHub, or email the maintainer for anything private.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ProsePage
      title="Contact"
      intro="Have a question, found a bug, or built something with Voxx? Most conversations happen in public on GitHub, and email works for anything that should stay private."
    >
      <h2>Bug reports</h2>
      <p>
        Whenever something goes wrong, open an{" "}
        <a
          href="https://github.com/prudentbird/voxx/issues"
          target="_blank"
          rel="noreferrer"
        >
          issue
        </a>{" "}
        with as much context as you can, and we will take it from there.
      </p>

      <h2>Feature requests</h2>
      <p>
        Whenever you need something Voxx does not do yet, open an{" "}
        <a
          href="https://github.com/prudentbird/voxx/issues"
          target="_blank"
          rel="noreferrer"
        >
          issue
        </a>{" "}
        describing what you are trying to build, and we will figure out the rest
        together.
      </p>

      <h2>Email and security</h2>
      <p>
        For anything that does not belong in a public thread, email prudentbird
        at <a href="mailto:me@prudentbird.com">me@prudentbird.com</a>. Please
        report security issues by email so they can be fixed before they become
        public.
      </p>
    </ProsePage>
  );
}
