"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setHidden(true);
        setMobileOpen(false);
      } else {
        setHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-transform duration-300 ease-in-out
        ${hidden ? "-translate-y-full" : "translate-y-0"}
        bg-[#111111] border-b border-[#333333]
      `}
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="text-white font-extrabold text-lg tracking-tight">
          AutoGRC
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 text-base font-semibold">
          <NavLink href="/overview" label="Overview" activePath={pathname} />
          <NavLink href="/frameworks" label="Frameworks" activePath={pathname} />
          <NavLink href="/applications" label="Applications" activePath={pathname} />
          <NavLink href="/integrations" label="Integrations" activePath={pathname} />
          <NavLink href="/landing" label="Capabilities" activePath={pathname} />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden text-base font-semibold text-[#cccccc]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>

          <div className="hidden md:flex items-center gap-2 text-sm text-[#cccccc]">
            <span className="font-medium">Jai Verma</span>
            <Image
              src="/images/avatar-placeholder.jpg"
              alt="User Avatar"
              width={32}
              height={32}
              className="rounded-full border border-[#333333]"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#333333] bg-[#111111]">
          <div className="flex flex-col gap-5 px-6 py-4 text-base font-semibold">
            <NavLink href="/overview" label="Overview" activePath={pathname} onClick={() => setMobileOpen(false)} />
            <NavLink href="/frameworks" label="Frameworks" activePath={pathname} onClick={() => setMobileOpen(false)} />
            <NavLink href="/applications" label="Applications" activePath={pathname} onClick={() => setMobileOpen(false)} />
            <NavLink href="/integrations" label="Integrations" activePath={pathname} onClick={() => setMobileOpen(false)} />
            <NavLink href="/landing" label="Capabilities" activePath={pathname} onClick={() => setMobileOpen(false)} />

            <div className="mt-4 pt-4 border-t border-[#333333] flex items-center gap-3">
              <Image
                src="/images/avatar-placeholder.png"
                alt="User Avatar"
                width={36}
                height={36}
                className="rounded-full border border-[#333333]"
              />
              <span className="text-sm font-medium text-[#cccccc]">
                Demo User
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ——— Helper ——— */

function NavLink({
  href,
  label,
  activePath,
  onClick,
}: {
  href: string;
  label: string;
  activePath: string;
  onClick?: () => void;
}) {
  const isActive =
    activePath === href || activePath.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        relative transition-colors
        ${isActive ? "text-white" : "text-[#cccccc] hover:text-white"}
      `}
    >
      {label}

      {isActive && (
        <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-white rounded-full" />
      )}
    </Link>
  );
}
