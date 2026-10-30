import { describe, it, expect } from 'vitest';
import { isBot, classifyBot } from '../bot-list';

describe('classifyBot returns reasons', () => {
  const cases: Array<[string, string]> = [
    ['Mozilla/5.0 GPTBot/1.0', 'ai_crawler:openai_gptbot'],
    ['Mozilla/5.0 ClaudeBot/1.0', 'ai_crawler:anthropic_claudebot'],
    ['Mozilla/5.0 CCBot/2.0', 'ai_crawler:common_crawl'],
    ['Mozilla/5.0 (compatible; PerplexityBot/1.0)', 'ai_crawler:perplexity'],
    ['meta-externalagent/1.1', 'ai_crawler:meta_external_agent'],
    ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'search:googlebot'],
    ['Mozilla/5.0 (compatible; AhrefsBot/7.0)', 'seo:ahrefs'],
    ['facebookexternalhit/1.1', 'social:facebook'],
    ['HeadlessChrome/114.0.5735.199', 'headless:chrome'],
    ['Mozilla/5.0 some-crawler/1.0', 'generic:crawler'],
    ['Google-NotebookLM', 'ai_crawler:google_notebooklm'],
    // Datacenter/automation fleet: plain desktop-Linux Chrome, no bot token.
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      'heuristic:datacenter_linux_chrome',
    ],
    // The four that were counting as people on /wa/ clicks (prod 2026-09-17).
    ['Mozilla/5.0 (compatible; RSiteAuditor)', 'seo:rsiteauditor'],
    ['rednote-websearch-bot', 'search:rednote'],
    ['Dragonfly/1.0 (+https://publisherdiscovery.com/bots)', 'seo:publisherdiscovery_dragonfly'],
    [
      'AIWebIndex/2.0 (+https://lyrenth.com/bot; AI-readable web index)',
      'ai_crawler:lyrenth_aiwebindex',
    ],
    // HTTP libraries.
    ['Python/3.14 aiohttp/3.14.1', 'library:aiohttp'],
    ['python-requests/2.32.3', 'library:python_requests'],
    ['curl/8.7.1', 'library:curl'],
    ['Go-http-client/2.0', 'library:go_http'],
    // A crawler that names itself only by URL.
    ['SomethingNew/1.0 (+https://example.com/about-us)', 'generic:self_identifying_url'],
    // Chrome DevTools emulation presets — the automation fleet's "mobile" UAs.
    [
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'heuristic:devtools_emulation',
    ],
    [
      'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'heuristic:devtools_emulation',
    ],
    [
      'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'heuristic:devtools_emulation',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      'heuristic:devtools_emulation',
    ],
  ];

  cases.forEach(([ua, expectedReason]) => {
    it(`classifies "${ua.slice(0, 50)}…" as ${expectedReason}`, () => {
      const result = classifyBot(ua);
      expect(result.isBot).toBe(true);
      expect(result.reason).toBe(expectedReason);
    });
  });

  it('returns isBot=false, reason=null for empty UA', () => {
    expect(classifyBot('')).toEqual({ isBot: false, reason: null });
    expect(classifyBot(null)).toEqual({ isBot: false, reason: null });
    expect(classifyBot(undefined)).toEqual({ isBot: false, reason: null });
  });

  it('returns isBot=false for a real Chrome UA', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    expect(classifyBot(ua)).toEqual({ isBot: false, reason: null });
  });
});

describe('devtools_emulation heuristic', () => {
  it('does NOT catch a current real iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1';
    expect(classifyBot(ua)).toEqual({ isBot: false, reason: null });
  });

  it('does NOT catch a current real Android phone', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36';
    expect(classifyBot(ua)).toEqual({ isBot: false, reason: null });
  });
});

describe('datacenter_linux_chrome heuristic', () => {
  it('does NOT catch a real Linux-kernel mobile (Android Chrome)', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36';
    expect(classifyBot(ua)).toEqual({ isBot: false, reason: null });
  });

  it('does NOT catch desktop-Linux Firefox (heuristic is Chrome-specific)', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0';
    expect(classifyBot(ua)).toEqual({ isBot: false, reason: null });
  });

  it('does NOT catch macOS or Windows Chrome', () => {
    expect(
      classifyBot(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      ),
    ).toEqual({ isBot: false, reason: null });
  });
});

describe('isBot', () => {
  describe('known bots are detected', () => {
    const bots = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
      'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
      'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      'Mozilla/5.0 (compatible; Sogou web spider/4.0)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
      'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      'Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)',
      'Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)',
      'Mozilla/5.0 (compatible; PetalBot; +https://aspiegel.com/petalbot)',
      'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
      'Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)',
      'ia_archiver (+http://www.alexa.com/site/help/webmasters; crawler@alexa.com)',
      'HeadlessChrome/114.0.5735.199',
      'PhantomJS/2.1.1',
    ];

    bots.forEach((ua) => {
      it(`detects: ${ua.slice(0, 60)}...`, () => {
        expect(isBot(ua)).toBe(true);
      });
    });
  });

  describe('real browsers pass through', () => {
    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    ];

    browsers.forEach((ua) => {
      it(`passes: ${ua.slice(0, 60)}...`, () => {
        expect(isBot(ua)).toBe(false);
      });
    });
  });

  it('returns false for empty string', () => {
    expect(isBot('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isBot('GOOGLEBOT/2.1')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; BINGBOT/2.0)')).toBe(true);
  });
});

describe('Pinterest', () => {
  it('does not flag the Pinterest in-app browser (real visitors)', () => {
    const ios =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [Pinterest/iOS]';
    const android =
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 [Pinterest/Android]';
    expect(classifyBot(ios)).toEqual({ isBot: false, reason: null });
    expect(classifyBot(android)).toEqual({ isBot: false, reason: null });
  });

  it('flags the Pinterest crawler', () => {
    expect(
      classifyBot('Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)'),
    ).toEqual({ isBot: true, reason: 'social:pinterest' });
    expect(classifyBot('Pinterest/0.2 (+http://www.pinterest.com/bot.html)').reason).toBe(
      'social:pinterest',
    );
  });
});
