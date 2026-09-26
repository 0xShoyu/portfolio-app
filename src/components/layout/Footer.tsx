import Link from "next/link";
import { Terminal, Github, Mail } from "lucide-react";
import { Container } from "@/components/ui/Container";

// Lucide dropped/renamed a few brand icons across versions, so — same pattern
// as the custom FigmaIcon in TechBadge.tsx — the X mark is a small inline SVG
// instead of an import, to avoid depending on a specific lucide-react version.
const XIcon = ({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const footerLinks = [
  { name: "Portfolio", href: "/#portfolio" },
  { name: "Tools", href: "/#tools" },
  { name: "Blog", href: "/blog" },
];

// TODO: swap these placeholders for your real profile URLs.
const socialLinks = [
  { name: "GitHub", href: "https://github.com/0xShoyu", icon: Github },
  { name: "X / Twitter", href: "https://x.com/Dev0xShoyu", icon: XIcon },
  { name: "Email", href: "mailto:yangshoyu@gmail.com", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-12">
      <Container className="py-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-12">
          {/* Brand */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg tracking-tight w-fit"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Terminal size={18} />
              </div>
              <span>0xShoyu</span>
            </Link>
            <p className="text-muted text-sm font-light leading-relaxed">
              Product Engineer focused on system design & delivery — turning
              abstract ideas into production-ready code.
            </p>
          </div>

          {/* Navigate */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Navigate
            </span>
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted hover:text-primary transition-colors w-fit"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Connect */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Connect
            </span>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    social.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  aria-label={social.name}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted hover:text-primary hover:border-primary/50 transition-colors"
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-xs">
            © {new Date().getFullYear()} 0xShoyu. Built with Next.js & Coffee.
          </p>
          <p className="text-muted text-xs">Designed & engineered solo.</p>
        </div>
      </Container>
    </footer>
  );
}
