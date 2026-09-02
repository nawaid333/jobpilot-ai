import crypto from "node:crypto";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function secret() { const value = process.env.GMAIL_TOKEN_ENCRYPTION_KEY; if (!value) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured"); return crypto.createHash("sha256").update(value).digest(); }
export function encryptToken(value: string) { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
export function decryptToken(value: string) { const [iv, tag, encrypted] = value.split("."); const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"); }
export function gmailConfig() { const clientId=process.env.GOOGLE_CLIENT_ID; const clientSecret=process.env.GOOGLE_CLIENT_SECRET; const redirect=process.env.GOOGLE_REDIRECT_URI; if(!clientId||!clientSecret||!redirect) throw new Error("Google OAuth environment variables are not configured"); return {clientId,clientSecret,redirect}; }
export function googleAuthUrl(state:string) { const {clientId,redirect}=gmailConfig(); const params=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:"code",scope:SCOPE,access_type:"offline",prompt:"consent",state}); return `${GOOGLE_AUTH}?${params}`; }
export async function exchangeCode(code:string) { const {clientId,clientSecret,redirect}=gmailConfig(); const r=await fetch(GOOGLE_TOKEN,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirect,grant_type:"authorization_code"})}); if(!r.ok) throw new Error("Google OAuth exchange failed"); return r.json() as Promise<{access_token:string;refresh_token?:string;scope:string;expires_in:number}>; }
export async function refreshAccessToken(refreshToken:string) { const {clientId,clientSecret}=gmailConfig(); const r=await fetch(GOOGLE_TOKEN,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})}); if(!r.ok) throw new Error("Google token refresh failed"); return r.json() as Promise<{access_token:string;expires_in:number}>; }
export async function gmailGet(path:string,accessToken:string){const r=await fetch(`${GMAIL_API}${path}`,{headers:{Authorization:`Bearer ${accessToken}`},cache:"no-store"}); if(!r.ok) throw new Error(`Gmail API request failed: ${r.status}`); return r.json();}
export {SCOPE};
