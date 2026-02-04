"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
type NavbarProps = {
  variant?: "landing" | "app";
};

export default function Navbar({ variant = "app" }: NavbarProps) {
  const pathname = usePathname();
  const isLanding = variant === "landing";

  return (
    <nav className="fixed inset-x-0 top-5 z-50 px-4">
      <div
        className="
          glass-dark
          mx-auto max-w-6xl
          px-6 py-3
          flex items-center justify-between
          rounded-xl
          border border-white/10
          transition-all duration-500 ease-out
          hover:bg-white/15
          hover:border-yellow-400/60
          hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_24px_70px_rgba(250,204,21,0.18)]
          hover:-translate-y-1
        "
      >
        {/* LOGO (always visible) */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/AutoGRC.ico" alt="AutoGRC" width={40} height={40} />
          <span className="hidden sm:inline text-2xl font-bold hover:text-yellow-400">
            AutoGRC
          </span>
        </Link>

        {/* APP LINKS (app only) */}
        {!isLanding && (
          <div className="hidden md:flex items-center gap-8 text-lg font-medium">
            <NavLink href="/overview" label="Overview" activePath={pathname} />
            <NavLink href="/frameworks" label="Frameworks" activePath={pathname} />
            <NavLink href="/applications" label="Applications" activePath={pathname} />
            <NavLink href="/integrations" label="Integrations" activePath={pathname} />
          </div>
        )}

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          {/* LANDING CTA */}
          {isLanding && (
            <Link
              href="/overview"
              className="px-5 py-2 rounded-lg font-semibold
                         bg-white text-black hover:bg-yellow-400 transition"
            >
              Get Started
            </Link>
          )}

          {/* APP USER PROFILE */}
          {/* APP USER PROFILE */}
{!isLanding && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-white/10 transition focus:outline-none">
        <Image
          src="/profile.jfif"
          alt="Profile"
          width={36}
          height={36}
          className="rounded-full border border-white/20"
        />
        <span className="hidden sm:inline font-semibold">
          Chandresh
        </span>
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="center"
      sideOffset={12}
      className="
        w-56
        glass-dark
        border border-white/10
        rounded-xl
        shadow-xl
      "
    >
     

      

      <DropdownMenuItem className="cursor-pointer hover:bg-white/10">
        Settings
      </DropdownMenuItem>

      <DropdownMenuItem className="cursor-pointer hover:bg-white/10">
        Manage Account
      </DropdownMenuItem>

      <DropdownMenuItem className="cursor-pointer hover:bg-white/10">
        Billing
      </DropdownMenuItem>

      <DropdownMenuSeparator className="bg-white/10" />

      <DropdownMenuItem className="cursor-pointer text-red-400 hover:bg-red-400/10">
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}

        </div>
      </div>
    </nav>
  );
}

/* NavLink helper */
function NavLink({
  href,
  label,
  activePath,
}: {
  href: string;
  label: string;
  activePath: string;
}) {
  const isActive =
    activePath === href || activePath.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`relative transition-colors ${
        isActive ? "text-white" : "text-[#cccccc] hover:text-white"
      }`}
    >
      {label}
      {isActive && (
        <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-yellow-400 rounded-full" />
      )}
    </Link>
  );
}
