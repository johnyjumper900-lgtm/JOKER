export function pickFrenchMaleVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const fr = voices.filter((v) => v.lang?.toLowerCase().startsWith("fr"));
  if (fr.length === 0) return null;

  // Priorité absolue: Microsoft + Homme
  const microsoftMale = fr.find((v) => /microsoft/i.test(v.name) && (/homme/i.test(v.name) || /male/i.test(v.name) || /paul/i.test(v.name) || /henri/i.test(v.name)));
  if (microsoftMale) return microsoftMale;

  const malePatterns = [
    /paul/i,
    /henri/i,
    /thomas/i,
    /nicolas/i,
    /sebastien/i,
    /jean/i,
    /antoine/i,
    /etienne/i,
    /daniel/i,
    /alexandre/i,
    /mathieu/i,
    /gabriel/i,
    /lucas/i,
    /\bmale\b/i,
    /homme/i,
    /masculin/i,
  ];
  for (const re of malePatterns) {
    const v = fr.find((v) => re.test(v.name));
    if (v) return v;
  }
  // Préférer "Google français" qui sonne plutôt grave
  const google = fr.find((v) => /google/i.test(v.name));
  if (google) return google;
  return fr[0] ?? null;
}
