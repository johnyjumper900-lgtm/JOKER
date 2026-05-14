// WebAuthn / Passkey biometric unlock (Face ID / Touch ID on iPhone, Windows Hello, etc.)
// Stocke un credential local lié au domaine. Aucun serveur requis (mode "discoverable credential").

const CRED_KEY = "magic.biometric.credId";
const USER_KEY = "magic.biometric.userHandle";
const RP_NAME = "Magic Pronostics";

const b64uEncode = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64uDecode = (str: string): Uint8Array => {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const isBiometricSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials &&
    typeof navigator.credentials.create === "function"
  );
};

export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isBiometricSupported()) return false;
  try {
    return await (
      window.PublicKeyCredential as any
    ).isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const isBiometricEnrolled = (): boolean => {
  try {
    return !!localStorage.getItem(CRED_KEY);
  } catch {
    return false;
  }
};

export const clearBiometric = () => {
  try {
    localStorage.removeItem(CRED_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
};

/** Enregistre Face ID / Touch ID comme credential. */
export const enrollBiometric = async (): Promise<boolean> => {
  if (!isBiometricSupported()) {
    throw new Error("WebAuthn non supporté sur cet appareil");
  }
  const ok = await isPlatformAuthenticatorAvailable();
  if (!ok) {
    throw new Error("Aucun authentificateur biométrique disponible (Face ID / Touch ID)");
  }

  const userHandle = crypto.getRandomValues(new Uint8Array(16));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: RP_NAME, id: window.location.hostname },
    user: {
      id: userHandle,
      name: "magic-user",
      displayName: "Magic User",
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required",
      requireResidentKey: true,
    },
    timeout: 60000,
    attestation: "none",
  };

  const cred = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("Enrôlement annulé");

  localStorage.setItem(CRED_KEY, b64uEncode(cred.rawId));
  localStorage.setItem(USER_KEY, b64uEncode(userHandle));
  return true;
};

/** Demande Face ID / Touch ID pour déverrouiller. */
export const verifyBiometric = async (): Promise<boolean> => {
  if (!isBiometricSupported()) return false;
  const credId = localStorage.getItem(CRED_KEY);
  if (!credId) throw new Error("Biométrie non enregistrée");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    allowCredentials: [
      {
        id: b64uDecode(credId).buffer as ArrayBuffer,
        type: "public-key",
        transports: ["internal"],
      },
    ],
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;

  return !!assertion;
};
