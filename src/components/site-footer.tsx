import { site } from "@/config/site";
import { getFeedbackEmail } from "@/lib/env";

export function SiteFooter() {
  const feedback = getFeedbackEmail();
  return (
    <footer className="border-t border-navy/10 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-navy/70 sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.organization}
        </p>
        {feedback && (
          <p>
            Questions or feedback?{" "}
            <a
              href={`mailto:${feedback}?subject=${encodeURIComponent(`${site.name} feedback`)}`}
              className="font-medium text-carolina-dark underline"
            >
              Email PBP
            </a>
          </p>
        )}
        <p className="font-semibold text-orange">{site.slogan}</p>
      </div>
    </footer>
  );
}
