"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COLLAGE_ART } from "./CollageArt";

const ACTS = [
  {
    n: "01",
    word: "RECORD",
    caption: "one button. camera or screen. two minutes at a time.",
  },
  {
    n: "02",
    word: "CUT",
    caption: "skim, trim, split, reorder — iMovie basics, zero exports.",
  },
  {
    n: "03",
    word: "FINALIZE",
    caption: "your takes become one film, rendered right in the browser.",
  },
  {
    n: "04",
    word: "SHARE",
    caption: "private by default. sent only to the people you choose.",
  },
];

// Abstract illustration cards only — never a user's own footage. This page
// renders for anyone hitting "/", signed in or not, so nothing personal
// belongs here as decoration.
const COLLAGE_SLOTS = [
  { rotate: -7, top: "2%", left: "6%", w: 132, ramp: "ember" },
  { rotate: 5, top: "0%", left: "42%", w: 158, ramp: "ink" },
  { rotate: -3, top: "30%", left: "70%", w: 140, ramp: "ember" },
  { rotate: 8, top: "46%", left: "16%", w: 118, ramp: "ink" },
  { rotate: -5, top: "58%", left: "48%", w: 150, ramp: "ink" },
] as const;

export default function Landing({ authed }: { authed: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-hero-line]",
        { y: 90, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.12,
          ease: "power4.out",
          delay: 0.15,
        }
      );

      gsap.fromTo(
        "[data-collage-card]",
        { y: 40, opacity: 0, rotate: 0 },
        {
          y: 0,
          opacity: 1,
          rotate: (i) => COLLAGE_SLOTS[i].rotate,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.5,
        }
      );

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const acts = gsap.utils.toArray<HTMLElement>("[data-act]");
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "[data-acts]",
            start: "top top",
            end: `+=${acts.length * 90}%`,
            pin: true,
            scrub: 0.6,
          },
        });
        acts.forEach((act, i) => {
          tl.fromTo(
            act,
            { yPercent: 18, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1, ease: "power2.out" },
            i * 2
          );
          if (i < acts.length - 1) {
            tl.to(
              act,
              { yPercent: -18, opacity: 0, duration: 1, ease: "power2.in" },
              i * 2 + 1.4
            );
          }
        });

        gsap.fromTo(
          "[data-outro]",
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: "[data-outro]", start: "top 75%" },
          }
        );
      });
    }, root);

    return () => {
      ctx.revert();
      mm.revert();
    };
  }, []);

  const cta = authed
    ? { href: "/record", label: "RECORD TODAY" }
    : { href: "/login", label: "START YOUR ARCHIVE" };

  return (
    <div ref={root}>
      <section className="grid min-h-[calc(100dvh-57px)] grid-cols-1 gap-10 px-6 py-14 md:grid-cols-[1.15fr_1fr] md:gap-6 md:px-10">
        <div className="flex flex-col justify-between">
          <div className="mt-10 md:mt-16">
            <p data-hero-line className="text-eyebrow text-ember">
              every day, one film
            </p>
            <h1 className="font-display mt-6 text-[13.5vw] leading-[0.9] tracking-tight md:text-[8vw]">
              <span data-hero-line className="block">
                DOCUMENT
              </span>
              <span
                data-hero-line
                className="font-voice mt-1 block text-[15vw] text-bone md:text-[8.5vw]"
              >
                your days
              </span>
            </h1>
            <p
              data-hero-line
              className="mt-10 max-w-md text-sm leading-relaxed text-bone-muted"
            >
              Record short clips through the day. Cut them together in
              seconds. Keep the film for yourself, or send it to the few
              people who matter.
            </p>
          </div>
          <div
            data-hero-line
            className="mt-16 flex items-center justify-between text-xs tracking-[0.12em] md:mt-0"
          >
            <Link
              href={cta.href}
              className="flex items-center gap-3 text-bone transition-transform duration-500 hover:translate-x-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ember text-ember-deep">
                ●
              </span>
              {cta.label.toLowerCase()}
            </Link>
            <span className="hidden text-bone-faint md:inline">scroll —</span>
          </div>
        </div>

        <div className="relative hidden min-h-[420px] md:block">
          {COLLAGE_SLOTS.map((slot, i) => {
            const Art = COLLAGE_ART[i % COLLAGE_ART.length];
            return (
              <div
                key={i}
                data-collage-card
                style={{
                  position: "absolute",
                  top: slot.top,
                  left: slot.left,
                  width: slot.w,
                }}
                className="aspect-[3/4] overflow-hidden rounded-lg shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-ink-3"
              >
                <div
                  className={
                    slot.ramp === "ember"
                      ? "flex h-full w-full items-center justify-center bg-ember/15 text-ember"
                      : "flex h-full w-full items-center justify-center bg-ink-3 text-bone-muted"
                  }
                >
                  <Art />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section data-acts className="relative min-h-dvh overflow-hidden">
        {ACTS.map((a) => (
          <div
            key={a.n}
            data-act
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          >
            <p className="text-eyebrow text-ember">{a.n}</p>
            <h2 className="font-display mt-4 text-[16vw] leading-none md:text-[11vw]">
              {a.word}
            </h2>
            <p className="mt-6 max-w-sm text-sm text-bone-muted">{a.caption}</p>
          </div>
        ))}
      </section>

      <section
        data-outro
        className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center"
      >
        <p className="text-eyebrow text-ember">no audience. no algorithm.</p>
        <h2 className="font-display mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">
          A FILM ARCHIVE
          <br />
          <span className="font-voice text-bone">of your life</span>
        </h2>
        <Link
          href={cta.href}
          className="font-display mt-12 rounded-full border border-ember px-10 py-5 text-xs tracking-[0.18em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
        >
          {cta.label}
        </Link>
      </section>
    </div>
  );
}
