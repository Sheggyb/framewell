/**
 * Texts for the legal area (Privacy policy, Terms of use). Keys are grouped by screen; keep them
 * short and literal. {name}, {email}: who runs Framewell. <b>…</b> is bold; other tags are links.
 */
export const legal = {
  translationNote: "This translation is for convenience; the English version is the official one.",
  lastUpdated: "Last updated {date}",
  privacyLink: "Privacy",
  termsLink: "Terms",
  privacy: {
    title: "Privacy policy",
    intro:
      "Short version: the Framewell app doesn't collect your personal data. Your videos, photos, sound and projects stay in the browser on your device. There are no accounts, ads, analytics or tracking cookies. Only if you choose to tip us on Ko-fi do we receive a few details, explained below.",
    who: {
      title: "Who we are",
      body: "Framewell is run by {name}. Questions about privacy: {email}.",
    },
    device: {
      title: "What stays on your device",
      lead: "Everything you make with Framewell is processed and stored only on your device, in your browser's own storage:",
      media: "the videos, photos and audio you add, and your voiceover recordings;",
      projects: "your projects, saved text styles and editor settings;",
      exports: "the videos you export.",
      body: "None of this is uploaded to us or to anyone else. We cannot see it, and we can't recover it for you if it's deleted. Use <b>Back up</b> to keep a copy as a file.",
    },
    mic: {
      title: "Microphone",
      body: "Framewell asks for the microphone only when you record a voiceover. The recording goes straight into your project on your device. You can withdraw permission at any time in your browser settings.",
    },
    hosting: {
      title: "What our hosting provider sees",
      body: "The website is hosted by Vercel. Like any website, loading the page means your browser asks Vercel's servers for Framewell's files. That request includes technical details such as your IP address and browser type, which the host may keep in short-lived logs for security and to keep the service running. We don't use these to identify you or build profiles. See <vercel>Vercel's privacy policy</vercel>.",
    },
    cookies: {
      title: "No cookies, ads or trackers",
      body: "Framewell uses no advertising, analytics or tracking cookies, and no third-party trackers. Fonts are served from our own site. The browser storage mentioned above is used only to keep your work on your device.",
    },
    sharing: {
      title: "Sharing your videos",
      body: "When you save or share an exported video, it goes wherever you choose (Photos, Files, TikTok, Instagram…). From then on, that app's own privacy policy applies.",
    },
    tips: {
      title: "Tips on Ko-fi",
      body: 'Framewell is free. If you choose to leave a tip, the "Support Framewell" links open our page on Ko-fi in a new tab; nothing from Ko-fi is loaded inside Framewell. Ko-fi (Ko-fi Labs Limited, UK) and its payment providers (Stripe or PayPal) handle the payment under their own privacy policies.',
      controller:
        "When you tip, Ko-fi shares some details with us, and for those we are the data controller (independently of Ko-fi). This is what we receive and how we handle it:",
      what: "<b>What:</b> the amount and date, the name or username you give, your email address, and any message you write. We never receive your card or bank details.",
      why: "<b>Why:</b> to keep records of the tips we receive, as tax and accounting rules require, and to answer you if you contact us. We don't use your email for newsletters or marketing, and we don't share it with anyone.",
      basis: "<b>Legal basis:</b> our legal obligation to keep records of income, and our legitimate interest in replying to messages.",
      howLong: "<b>How long:</b> as long as Swedish tax and accounting rules require, then deleted.",
    },
    rights: {
      title: "Your rights",
      body: "The only personal data we hold is from tips (see above). If you tipped, you can ask us to see, correct or delete your details, or object to how we use them, by writing to {email}. We may keep what the law requires for our records. If you're unhappy with how we handle your data, you can complain to the Swedish Authority for Privacy Protection (<imy>IMY</imy>).",
      device:
        "Everything else Framewell stores stays on your device: to remove it, delete your projects in <b>My videos</b> or clear this site's data in your browser settings.",
    },
    changes: {
      title: "Changes",
      body: "If this policy changes, we'll update this page and the date at the top.",
    },
  },
  terms: {
    title: "Terms of use",
    intro:
      "Short version: Framewell is free to use. What you make is yours, and you're responsible for having the right to use the music, clips and images you put in it. Keep backups: your work lives only on your device.",
    using: {
      title: "Using Framewell",
      body: "Framewell is a free video editor that runs in your browser, provided by {name}. By using it you agree to these terms. If you don't agree, please don't use it.",
    },
    content: {
      title: "Your content is yours",
      body: "You keep all rights to the videos you make. Framewell never receives your content, and we claim no rights to it. No watermark is added.",
    },
    responsibility: {
      title: "Your responsibility",
      rights:
        "Only use music, video, images and fonts you have the right to use. Many popular songs are copyrighted: for trending sounds, add them inside TikTok, Instagram or YouTube when you post.",
      people: "Get permission from people who appear in your videos where the law requires it.",
      law: "Follow the law and the rules of the platforms you post to.",
      harm: "Don't use Framewell to make content that is illegal, harms others or infringes their rights.",
    },
    backups: {
      title: "Keep backups",
      body: "Your projects are stored only in your browser on your device. They can be lost if you clear your browser data, change device, or the browser frees up space. We can't recover them. Use <b>Back up</b> in My videos to keep a copy.",
    },
    guarantees: {
      title: "No guarantees",
      body: 'Framewell is provided free, "as is" and "as available". We work to make it reliable, but we can\'t promise it will always work on every device, be free of errors, or keep every feature. We may change or stop the service at any time.',
    },
    liability: {
      title: "Liability",
      body: "As far as the law allows, we aren't liable for lost projects, lost content or other indirect loss from using Framewell. Nothing in these terms limits rights you have under consumer law that can't be excluded.",
    },
    names: {
      title: "Other companies' names",
      body: "Framewell mentions TikTok, Instagram, Reels, YouTube and Shorts so you know which formats it makes videos for. These are trademarks of their respective owners. Framewell is independent and isn't affiliated with, sponsored by or endorsed by any of them.",
    },
    contact: {
      title: "Changes and contact",
      body: "We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of Sweden. Questions: {email}.",
    },
  },
};
