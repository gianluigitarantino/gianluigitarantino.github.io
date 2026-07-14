export const siteUrl = "https://www.gianluigitarantino.com";

export const pageGroups = [
  {
    it: { file: "index.html", path: "/" },
    en: { file: "en-home.html", path: "/en/" },
  },
  {
    it: { file: "architettura.html", path: "/architettura/" },
    en: { file: "en-architecture.html", path: "/en/architecture/" },
  },
  {
    it: { file: "interior.html", path: "/interior/" },
    en: { file: "en-interiors.html", path: "/en/interiors/" },
  },
  {
    it: { file: "personale.html", path: "/personale/" },
    en: { file: "en-personal.html", path: "/en/personal/" },
  },
  {
    it: { file: "profilo.html", path: "/profilo/" },
    en: { file: "en-about.html", path: "/en/about/" },
  },
];

export const indexedPages = pageGroups.flatMap((group) =>
  ["it", "en"].map((language) => ({ ...group[language], group, language })),
);
