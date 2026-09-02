"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Experience = { role: string; company: string; duration: string; highlights: string[] };
type Education = { degree: string; institution: string; year: string };
type Profile = {
  atsScore: number;
  candidate: { name: string | null; headline: string | null; location: string | null };
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  strengths: string[];
  targetRoles: string[];
  savedAt?: string;
};

const empty: Profile = {
  atsScore: 0,
  candidate: { name: null, headline: null, location: null },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  strengths: [],
  targetRoles: [],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobpilot-career-profile");
      if (raw) setProfile({ ...empty, ...JSON.parse(raw) });
    } catch { /* ignore malformed local data */ }
    setLoaded(true);
  }, []);

  function updateCandidate(key: keyof Profile["candidate"], value: string) {
    setProfile((p) => ({ ...p, candidate: { ...p.candidate, [key]: value } }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem("jobpilot-career-profile", JSON.stringify({ ...profile, savedAt: new Date().toISOString() }));
    setSaved(true);
  }

  if (!loaded) return null;

  return (
    <main className="analyze-page profile-page">
      <nav className="nav shell">
        <Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link>
        <span className="analyze-nav-label">MASTER CAREER PROFILE</span>
        <Link className="nav-cta" href="/analyze">Analyze CV ↗</Link>
      </nav>

      <section className="profile-shell shell">
        <div className="profile-header">
          <div>
            <div className="eyebrow"><span className="pulse" /> Your source of truth</div>
            <h1>Master Career <em>Profile.</em></h1>
            <p>This is the structured career profile JobPilot will use for future job matching and tailored applications. Edit it to keep everything accurate.</p>
          </div>
          <div className="profile-score"><small>CV ATS SCORE</small><strong>{profile.atsScore}<span>/100</span></strong></div>
        </div>

        {!profile.summary && profile.skills.length === 0 ? (
          <div className="empty-profile">
            <div className="upload-icon">✦</div>
            <h2>No career profile yet.</h2>
            <p>Analyze your CV first, then save the extracted information here.</p>
            <Link className="button primary" href="/analyze">Analyze my CV ↗</Link>
          </div>
        ) : (
          <>
            <div className="profile-grid">
              <article className="profile-card profile-wide">
                <small className="kicker">PERSONAL & PROFESSIONAL</small>
                <div className="field-grid">
                  <label>Name<input value={profile.candidate.name || ""} onChange={(e) => updateCandidate("name", e.target.value)} /></label>
                  <label>Location<input value={profile.candidate.location || ""} onChange={(e) => updateCandidate("location", e.target.value)} /></label>
                  <label className="field-full">Professional headline<input value={profile.candidate.headline || ""} onChange={(e) => updateCandidate("headline", e.target.value)} /></label>
                </div>
              </article>

              <article className="profile-card profile-wide"><small className="kicker">CAREER SUMMARY</small><textarea value={profile.summary} onChange={(e) => { setProfile((p) => ({ ...p, summary: e.target.value })); setSaved(false); }} /></article>

              <article className="profile-card"><small className="kicker">TARGET ROLES</small><div className="chips">{profile.targetRoles.map((x) => <span key={x}>{x}</span>)}</div></article>
              <article className="profile-card"><small className="kicker">CORE SKILLS</small><div className="chips">{profile.skills.map((x) => <span key={x}>{x}</span>)}</div></article>

              <article className="profile-card profile-wide"><small className="kicker">EXPERIENCE</small>{profile.experience.length ? profile.experience.map((job, i) => <div className="profile-item" key={`${job.company}-${i}`}><div><b>{job.role}</b><span>{job.company} · {job.duration}</span></div><ul>{job.highlights.map((h) => <li key={h}>{h}</li>)}</ul></div>) : <p>No experience extracted.</p>}</article>

              <article className="profile-card profile-wide"><small className="kicker">EDUCATION</small>{profile.education.length ? profile.education.map((edu, i) => <div className="profile-item" key={`${edu.institution}-${i}`}><b>{edu.degree}</b><span>{edu.institution} · {edu.year}</span></div>) : <p>No education extracted.</p>}</article>

              <article className="profile-card profile-wide"><small className="kicker">STRENGTHS</small><ul className="strength-list">{profile.strengths.map((x) => <li key={x}>✓ {x}</li>)}</ul></article>
            </div>
            <div className="profile-actions">
              <button className="button primary" onClick={save}>{saved ? "✓ Profile saved" : "Save changes ↗"}</button>
              <Link className="button secondary" href="/analyze">Re-analyze CV</Link>
            </div>
            <p className="truth-note">Truth rule: this profile is only a structured version of information extracted from your CV. Do not add claims you cannot support.</p>
          </>
        )}
      </section>
      <footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Master Career Profile</span><span>Built for real fit, not fake keywords.</span></footer>
    </main>
  );
}
