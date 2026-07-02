import type { Metadata } from "next";
import { ProsePage } from "~/components/prose-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How voxx handles your data. The software never sends your content anywhere, and this site uses only anonymous, cookieless analytics.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy"
      intro="This page explains what data voxx collects. Voxx never sends your content anywhere, its anonymous usage stats are easy to turn off, and the analytics on this website are cookieless."
    >
      <h2>Your content</h2>
      <p>
        Everything you write stays with you. Voxx runs at build time on your
        machine, turning markdown into HTML. What you publish is covered by your
        own privacy policy, not this one.
      </p>

      <h2>Usage data</h2>
      <p>
        Voxx collects anonymous signals about how it is used, nothing beyond
        that. To turn it off, run <code>voxx telemetry disable</code> or set{" "}
        <code>DO_NOT_TRACK=1</code>. CI environments do not send telemetry data.
      </p>

      <h2>Analytics</h2>
      <p>
        This website collects anonymous, aggregated metrics such as page views
        and load times to understand traffic and performance. It does not set
        advertising cookies, build cross-site profiles, or identify you
        personally.
      </p>

      <h2>Questions</h2>
      <p>
        Email prudentbird at{" "}
        <a href="mailto:me@prudentbird.com">me@prudentbird.com</a> with any
        privacy concerns. The policy
        can change over time, and this page always shows the current version.
      </p>
    </ProsePage>
  );
}
