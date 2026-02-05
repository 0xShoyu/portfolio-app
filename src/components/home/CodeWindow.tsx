"use client";

import { motion } from "framer-motion";

export function CodeWindow() {
  const codeLines = [
    {
      text: "async function executeSearch(jobId, query) {",
      indent: 0,
      color: "text-yellow-300",
    },
    {
      text: "  // 1. Auto-rotate Proxy & Cookies",
      indent: 0,
      color: "text-slate-500",
    },
    {
      text: "  const cookies = await pickCookieFile();",
      indent: 2,
      color: "text-sky-300",
    },
    { text: "", indent: 0, color: "" },
    {
      text: "  // 2. Browser Pool Management",
      indent: 0,
      color: "text-slate-500",
    },
    {
      text: "  await usePageWithQueue(jobId, async (page) => {",
      indent: 2,
      color: "text-purple-400",
    },
    {
      text: "    await page.setCookie(...cookies);",
      indent: 4,
      color: "text-white",
    },
    {
      text: "    await gotoSafe(page, `x.com/search?q=${query}`);",
      indent: 4,
      color: "text-green-400",
    },
    { text: "", indent: 0, color: "" },
    {
      text: "    // 3. Extraction & Persistence",
      indent: 0,
      color: "text-slate-500",
    },
    {
      text: "    const tweets = await scrapeTweets(page);",
      indent: 4,
      color: "text-blue-400",
    },
    {
      text: "    await db.tweets.insertMany(tweets);",
      indent: 4,
      color: "text-emerald-400",
    },
    { text: "", indent: 0, color: "" },
    {
      text: "    await gentleScroll(page); // 🤖 Humanize",
      indent: 4,
      color: "text-yellow-300",
    },
    { text: "  });", indent: 2, color: "text-purple-400" },
    { text: "}", indent: 0, color: "text-yellow-300" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative w-full max-w-lg rounded-xl border border-white/10 bg-black/50 backdrop-blur-md shadow-2xl shadow-black/50 overflow-hidden font-mono text-[10px] sm:text-xs leading-loose"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-4 py-2.5">
        {" "}
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />{" "}
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <div className="ml-4 text-[10px] font-medium text-slate-500 opacity-70">
          src/scanner/core.ts
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 overflow-x-auto">
        <div className="flex flex-col">
          {codeLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
              className="flex"
            >
              <span className="w-6 shrink-0 text-slate-700 select-none text-right mr-3 opacity-50">
                {i + 1}
              </span>
              <pre
                className={`${line.color} whitespace-pre font-medium`}
                style={{ paddingLeft: `${line.indent * 0.5}rem` }}
              >
                {line.text}
              </pre>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
    </motion.div>
  );
}
