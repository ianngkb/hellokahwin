/**
 * Known bot/crawler user-agent substrings, used for layer-2 server-side
 * classification on the analytics collect endpoint.
 *
 * Layer 1 is the JS-only tracker (most non-browser scrapers never run the
 * script). Layer 2 (this file) catches the bots that do execute JS or that
 * we explicitly want to keep recording so we can show them in the admin
 * dashboard separately.
 *
 * Pattern matching is case-insensitive substring. Order matters only when
 * a longer pattern would be a substring of a shorter one — list specific
 * patterns first so the reason returned is the most useful.
 */
const BOT_UA_PATTERNS: ReadonlyArray<readonly [pattern: string, reason: string]> = [
  // ── AI training / inference crawlers ───────────────────────────────────
  ['gptbot', 'ai_crawler:openai_gptbot'],
  ['chatgpt-user', 'ai_crawler:openai_chatgpt_user'],
  ['oai-searchbot', 'ai_crawler:openai_searchbot'],
  ['claudebot', 'ai_crawler:anthropic_claudebot'],
  ['claude-web', 'ai_crawler:anthropic_claude_web'],
  ['anthropic-ai', 'ai_crawler:anthropic'],
  ['perplexitybot', 'ai_crawler:perplexity'],
  ['perplexity-user', 'ai_crawler:perplexity_user'],
  ['ccbot', 'ai_crawler:common_crawl'],
  ['meta-externalagent', 'ai_crawler:meta_external_agent'],
  ['meta-externalfetcher', 'ai_crawler:meta_external_fetcher'],
  ['google-extended', 'ai_crawler:google_extended'],
  ['googleother', 'ai_crawler:google_other'],
  ['amazonbot', 'ai_crawler:amazonbot'],
  ['cohere-ai', 'ai_crawler:cohere'],
  ['youbot', 'ai_crawler:you_com'],
  ['diffbot', 'ai_crawler:diffbot'],
  ['mistralai-user', 'ai_crawler:mistral'],
  ['google-notebooklm', 'ai_crawler:google_notebooklm'],

  // ── Search engine indexers ─────────────────────────────────────────────
  ['googlebot', 'search:googlebot'],
  ['bingbot', 'search:bingbot'],
  ['slurp', 'search:yahoo_slurp'],
  ['duckduckbot', 'search:duckduckbot'],
  ['baiduspider', 'search:baidu'],
  ['yandexbot', 'search:yandex'],
  // The spiders only — a bare `sogou` would also match real people on the
  // Sogou mobile browser (`SogouMobileBrowser`).
  ['sogou web spider', 'search:sogou'],
  ['sogou inst spider', 'search:sogou'],
  ['sogou pic spider', 'search:sogou'],
  ['sogou spider', 'search:sogou'],
  ['exabot', 'search:exabot'],
  ['petalbot', 'search:petalbot'],
  ['applebot', 'search:applebot'],
  ['seznambot', 'search:seznam'],
  ['coccocbot', 'search:coccoc'],

  // ── SEO / commercial crawlers ──────────────────────────────────────────
  ['semrushbot', 'seo:semrush'],
  ['ahrefsbot', 'seo:ahrefs'],
  ['mj12bot', 'seo:mj12'],
  ['dotbot', 'seo:dotbot'],
  ['rogerbot', 'seo:rogerbot'],
  ['bytespider', 'seo:bytedance'],

  // ── Social media link previewers ───────────────────────────────────────
  ['facebookexternalhit', 'social:facebook'],
  ['facebot', 'social:facebook'],
  ['twitterbot', 'social:twitter'],
  ['linkedinbot', 'social:linkedin'],
  // The crawler only. A bare `pinterest` would also match the in-app browser
  // (`[Pinterest/iOS]`, `[Pinterest/Android]`) — real visitors from this site's
  // main social channel. `pinterest/0.` is the legacy crawler token.
  ['pinterestbot', 'social:pinterest'],
  ['pinterest/0.', 'social:pinterest'],
  ['slackbot', 'social:slack'],
  ['whatsapp', 'social:whatsapp'],
  ['telegrambot', 'social:telegram'],
  ['discordbot', 'social:discord'],
  ['embedly', 'social:embedly'],
  ['vkshare', 'social:vk'],
  ['showyoubot', 'social:showyou'],
  ['outbrain', 'social:outbrain'],

  // ── Archive / validator ────────────────────────────────────────────────
  ['ia_archiver', 'archive:wayback'],
  ['archive.org', 'archive:wayback'],
  ['w3c_validator', 'validator:w3c'],

  // ── Headless / scripted ────────────────────────────────────────────────
  ['headlesschrome', 'headless:chrome'],
  ['phantomjs', 'headless:phantomjs'],
  ['puppeteer', 'headless:puppeteer'],
  ['playwright', 'headless:playwright'],
  ['selenium', 'headless:selenium'],

  // ── Seen counting as people on /wa/ clicks (prod audit 2026-09-17) ─────
  // Between them these four put 2,554 fake "clicks" on the WhatsApp Links
  // page in six weeks. None carries a `bot/`, `crawler` or `spider` token,
  // so the generic fallbacks below never saw them.
  ['rsiteauditor', 'seo:rsiteauditor'],
  ['rednote-websearch-bot', 'search:rednote'],
  ['dragonfly/', 'seo:publisherdiscovery_dragonfly'],
  ['aiwebindex', 'ai_crawler:lyrenth_aiwebindex'],

  // ── HTTP libraries — no browser sends these ───────────────────────────
  ['aiohttp', 'library:aiohttp'],
  ['python-requests', 'library:python_requests'],
  ['python/', 'library:python'],
  ['python-urllib', 'library:python_urllib'],
  ['go-http-client', 'library:go_http'],
  ['node-fetch', 'library:node_fetch'],
  ['axios/', 'library:axios'],
  ['curl/', 'library:curl'],
  ['wget/', 'library:wget'],
  ['libwww-perl', 'library:perl'],
  ['java/', 'library:java'],
  ['okhttp', 'library:okhttp'],

  // ── Generic fallbacks (run last so specific reasons win) ───────────────
  ['crawler', 'generic:crawler'],
  ['spider', 'generic:spider'],
  ['bot/', 'generic:bot_slash'],
  // A URL inside the UA (`(+https://example.com/bot)`) is the crawler
  // convention for "here is who we are" — no browser ever includes one.
  ['+http', 'generic:self_identifying_url'],
];

/**
 * The device strings Chrome DevTools ships as emulation presets, lowercased.
 * Matched on the build id, not the model — a real "Nexus 5" on a later ROM
 * would carry a different build.
 */
const DEVTOOLS_EMULATION_PRESETS: ReadonlyArray<string> = [
  'nexus 5 build/mra58n', // Android 6.0
  'pixel 2 build/opd3.170816.012', // Android 8.0
  'sm-g900p build/lrx21t', // Galaxy S5, Android 5.0
  'iphone os 11_0 like mac os x', // the "iPhone X" preset
];

export interface BotClassification {
  isBot: boolean;
  reason: string | null;
}

/**
 * Classify a user-agent string. Returns the matched pattern's reason if any
 * pattern is a case-insensitive substring of the UA. The first match wins,
 * so the BOT_UA_PATTERNS order encodes priority (specific over generic).
 */
export function classifyBot(ua: string | null | undefined): BotClassification {
  if (!ua) return { isBot: false, reason: null };
  const lower = ua.toLowerCase();
  for (const [pattern, reason] of BOT_UA_PATTERNS) {
    if (lower.includes(pattern)) {
      return { isBot: true, reason };
    }
  }

  // Heuristic layer: desktop-Linux Chrome with no bot token. Real consumer
  // traffic to a Malaysian wedding site is overwhelmingly Windows / macOS /
  // iOS / Android; a plain `X11; Linux x86_64 … Chrome/…` desktop UA at scale
  // is the signature of a headless / datacenter automation fleet that spoofs a
  // vanilla browser UA (so it evades the substring list above). We exclude
  // Android and mobile so real Linux-kernel phones are never caught. This runs
  // LAST so any self-identifying bot above keeps its more specific reason.
  const isLinuxDesktop = lower.includes('x11; linux x86_64');
  const isChrome = lower.includes('chrome/');
  const isMobile = lower.includes('mobile') || lower.includes('android');
  if (isLinuxDesktop && isChrome && !isMobile) {
    return { isBot: true, reason: 'heuristic:datacenter_linux_chrome' };
  }

  // Heuristic layer 2: Chrome DevTools / Lighthouse device-emulation presets.
  // These exact device+build strings are what a headless Chrome sends when a
  // script picks "Nexus 5" or "iPhone" from the emulation menu; the devices
  // themselves (Android 5/6/8, iOS 11) are a decade old and do not show up in
  // real Malaysian traffic. On prod 2026-09-17 they were 1,518 "human" /wa/
  // clicks from as many rotating IPs, none of which had viewed a page first.
  for (const preset of DEVTOOLS_EMULATION_PRESETS) {
    if (lower.includes(preset)) {
      return { isBot: true, reason: 'heuristic:devtools_emulation' };
    }
  }

  return { isBot: false, reason: null };
}

/**
 * Back-compat shim — older call sites only need a boolean. Prefer
 * `classifyBot` in new code so we can populate `analytics_events.bot_reason`.
 */
export function isBot(ua: string | null | undefined): boolean {
  return classifyBot(ua).isBot;
}
