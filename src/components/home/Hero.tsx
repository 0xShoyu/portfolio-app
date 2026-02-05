"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, Terminal } from "lucide-react";
import Link from "next/link";
import { CodeWindow } from "./CodeWindow";

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center pt-12 pb-20 md:pt-20 md:pb-32 overflow-visible">
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none opacity-50" />
      <div className="absolute top-1/2 right-0 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex flex-col gap-y-6 md:gap-y-8"
        >
          {/* Badge */}
          <div>
            <div className="inline-flex items-center overflow-hidden rounded-full border border-amber-500/30 bg-amber-500/10 py-1.5 px-4 backdrop-blur-sm">
              <span className="relative flex h-2 w-2 mr-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-300 tracking-[0.15em] uppercase">
                Available for New Projects
              </span>
            </div>
          </div>

          {/* H1 */}
          <h1 className="flex flex-col gap-y-2 text-left">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Product Engineer.
            </span>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent leading-[1.2]">
              Focused on System Design & Delivery.
            </span>
          </h1>

          {/* Intro Paragraph */}
          <div className="max-w-xl">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-normal">
              I am{" "}
              <strong className="text-foreground font-semibold">0xShoyu</strong>
              .
              <br className="hidden md:block" />I translate{" "}
              <span className="text-rose-300 font-medium">
                abstract concepts
              </span>{" "}
              into{" "}
              <strong className="text-amber-300 font-medium">
                high-fidelity interfaces
              </strong>
              , and finally into{" "}
              <strong className="text-primary font-semibold">
                production-ready code
              </strong>
              .
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/portfolio"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Terminal size={20} />
              View Portfolio
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/docs"
              className="group inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-6 py-3.5 text-base font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-card hover:text-primary hover:border-primary/50"
            >
              <FileText size={20} />
              Read Docs
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="relative flex justify-center lg:justify-end w-full pl-0 lg:pl-10"
        >
          <CodeWindow />
        </motion.div>
      </div>
    </section>
  );
}
