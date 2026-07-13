"use client";

// Hippocampus — a bring-your-own-repo flashcard front-end.
//
// Flow: paste a fine-grained GitHub PAT -> pick one of your repos -> the app validates it against
// the deck-repo format (core/HIPPOCAMPUS_FORMAT.md) -> study dashboard (daily queue, cram, quiz).
// Grading updates an in-memory SM-2 map; "Sync" commits learning/reviews.json back via the API.
//
// Everything here is client-side. The token lives only in this tab's sessionStorage and is never
// committed anywhere. All SRS math comes from the vendored, pure ./core engine.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyReview,
  buildQueue,
  flattenDecks,
  practiceDeck,
  summarize,
  todayISO,
  type Card,
  type Deck,
  type Grade,
  type QueueCard,
  type Reviews
} from "./core";
import { getRepo, getUser, listRepos, type GitHubUser, type Repo } from "./lib/github";
import { loadRepo, saveDeck, saveReviews, type DeckFileRef, type LoadedRepo } from "./lib/repo";
import { addCard, collectIds, deleteCard, newCardId, updateCard } from "./lib/cards";
import { Dashboard } from "./dashboard";
import { DeckManager } from "./deck-manager";
import { QuizSession, StudySession } from "./study";
import { ACCENT, Btn, Panel } from "./ui";
import LightSwitch from "@/app/ui/lightswitch";

const TOKEN_KEY = "hc_pat";
const PAT_URL = "https://github.com/settings/personal-access-tokens/new";

type View = "gate" | "picker" | "loading" | "invalid" | "dashboard" | "study" | "quiz" | "manage";

export default function HippocampusApp() {
  const today = useMemo(() => todayISO(), []);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [view, setView] = useState<View>("gate");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loaded, setLoaded] = useState<LoadedRepo | null>(null);
  const [reviews, setReviews] = useState<Reviews>({});
  const [reviewsSha, setReviewsSha] = useState<string | undefined>(undefined);
  const [dirty, setDirty] = useState(0); // grades since last sync
  const [syncing, setSyncing] = useState(false);
  const [session, setSession] = useState<{ title: string; cards: QueueCard[] } | null>(null);

  // Live, mutable deck data (authoring edits this; reloaded from loadRepo on repo open).
  const [deckFiles, setDeckFiles] = useState<DeckFileRef[]>([]);
  const [manageDeckPath, setManageDeckPath] = useState<string | null>(null);
  const [savingDeck, setSavingDeck] = useState(false);

  // Derived deck list + cards + summaries (recompute as decks or reviews change).
  const decks = useMemo(() => deckFiles.map((f) => f.deck), [deckFiles]);
  const cards = useMemo(() => flattenDecks(decks), [decks]);
  const summaries = useMemo(() => summarize(decks, reviews, today), [decks, reviews, today]);
  const allIds = useMemo(() => collectIds(decks), [decks]); // for generating unique new-card ids

  // --- auth ---------------------------------------------------------------
  const signIn = useCallback(async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const u = await getUser(t);
      sessionStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setUser(u);
      setView("picker");
      setBusy(true);
      const list = await listRepos(t);
      setRepos(list);
    } catch (err) {
      setError(`Sign-in failed: ${(err as Error).message}. Check the token has the "Contents" repository permission.`);
      setView("gate");
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setRepos([]);
    setLoaded(null);
    setDeckFiles([]);
    setManageDeckPath(null);
    setReviews({});
    setReviewsSha(undefined);
    setDirty(0);
    setSession(null);
    setError(null);
    setView("gate");
  }, []);

  // Restore a token from this tab's sessionStorage on first mount.
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) signIn(saved);
  }, [signIn]);

  // --- repo loading -------------------------------------------------------
  const openRepo = useCallback(
    async (repo: Repo) => {
      setBusy(true);
      setError(null);
      setView("loading");
      try {
        const result = await loadRepo(token, repo);
        setLoaded(result);
        setDeckFiles(result.deckFiles);
        setManageDeckPath(null);
        setReviews(result.reviews);
        setReviewsSha(result.reviewsSha);
        setDirty(0);
        setSession(null);
        setView(result.validation.valid ? "dashboard" : "invalid");
      } catch (err) {
        setError(`Could not open ${repo.full_name}: ${(err as Error).message}`);
        setView("picker");
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const openManual = useCallback(
    async (input: string) => {
      const [owner, name] = input.trim().split("/");
      if (!owner || !name) {
        setError('Enter a repo as "owner/name".');
        return;
      }
      try {
        setBusy(true);
        const repo = await getRepo(token, owner, name);
        await openRepo(repo);
      } catch (err) {
        setError(`Could not find ${input}: ${(err as Error).message}`);
        setBusy(false);
      }
    },
    [token, openRepo]
  );

  // --- study actions ------------------------------------------------------
  const startDaily = useCallback(() => {
    const { cards: queue } = buildQueue(cards, reviews, { today });
    setSession({ title: "Daily review", cards: queue });
    setView("study");
  }, [cards, reviews, today]);

  const startCram = useCallback(
    (deck: string) => {
      setSession({ title: `Cram · ${deck}`, cards: practiceDeck(cards, reviews, deck) });
      setView("study");
    },
    [cards, reviews]
  );

  const onGrade = useCallback(
    (cardId: string, grade: Grade) => {
      setReviews((prev) => applyReview(prev, cardId, grade, today));
      setDirty((n) => n + 1);
    },
    [today]
  );

  const sync = useCallback(async () => {
    if (!loaded || dirty === 0) return;
    setSyncing(true);
    setError(null);
    try {
      const newSha = await saveReviews(token, loaded.repo, reviews, reviewsSha, dirty);
      setReviewsSha(newSha);
      setDirty(0);
    } catch (err) {
      setError(`Sync failed: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }, [loaded, dirty, token, reviews, reviewsSha]);

  // Auto-save pending progress whenever a study session ends. Batches to one commit per session
  // (not per card), so you never have to press Sync manually. `sync` no-ops when nothing is pending.
  const endSession = useCallback(() => {
    setView("dashboard");
    void sync();
  }, [sync]);

  // --- deck authoring -----------------------------------------------------
  // Mutate a deck in memory, then re-serialize + commit its file. Throws on failure so the editor
  // keeps the form open and shows the error.
  const persistDeck = useCallback(
    async (deckPath: string, mutate: (deck: Deck) => Deck, summary: string) => {
      if (!loaded) return;
      const idx = deckFiles.findIndex((f) => f.path === deckPath);
      if (idx < 0) return;
      const ref = deckFiles[idx];
      const updatedDeck = mutate(ref.deck);
      setSavingDeck(true);
      setError(null);
      try {
        const newSha = await saveDeck(token, loaded.repo, ref, updatedDeck, summary);
        setDeckFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, deck: updatedDeck, sha: newSha } : f)));
      } catch (err) {
        setError(`Save failed: ${(err as Error).message}`);
        throw err;
      } finally {
        setSavingDeck(false);
      }
    },
    [loaded, deckFiles, token]
  );

  const saveCard = useCallback(
    (deckPath: string, card: Card, isNew: boolean) => {
      // New cards arrive with an empty id from the editor; mint a globally-unique one here.
      const ref = deckFiles.find((f) => f.path === deckPath);
      const finalCard = isNew && ref ? { ...card, id: newCardId(ref.deck.deck, allIds) } : card;
      return persistDeck(
        deckPath,
        (deck) => (isNew ? addCard(deck, finalCard) : updateCard(deck, finalCard)),
        isNew ? "add card" : "edit card"
      );
    },
    [persistDeck, deckFiles, allIds]
  );
  const removeCard = useCallback(
    (deckPath: string, id: string) => persistDeck(deckPath, (deck) => deleteCard(deck, id), "delete card"),
    [persistDeck]
  );
  const openManage = useCallback(
    (deckId: string) => {
      const ref = deckFiles.find((f) => f.deck.deck === deckId);
      if (ref) {
        setManageDeckPath(ref.path);
        setView("manage");
      }
    },
    [deckFiles]
  );

  // --- render -------------------------------------------------------------
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 96px" }}>
      <Header
        user={user}
        repo={loaded?.repo ?? null}
        dirty={dirty}
        syncing={syncing}
        onSync={sync}
        onChangeRepo={() => {
          void sync();
          setView("picker");
        }}
        onSignOut={async () => {
          if (dirty > 0) await sync();
          signOut();
        }}
        onHome={() => {
          if (loaded) {
            void sync();
            setView("dashboard");
          }
        }}
      />

      {error && (
        <div style={{ margin: "16px 0", padding: "10px 14px", borderRadius: 10, border: "1px solid #ef4444", color: "#ef4444", fontSize: 14 }}>
          {error}
        </div>
      )}

      {view === "gate" && <Gate busy={busy} onSubmit={signIn} />}
      {view === "picker" && <Picker repos={repos} busy={busy} onOpen={openRepo} onManual={openManual} />}
      {view === "loading" && <Centered>Loading & validating repo…</Centered>}
      {view === "invalid" && loaded && <Invalid loaded={loaded} onBack={() => setView("picker")} />}
      {view === "dashboard" && loaded && (
        <Dashboard
          summaries={summaries}
          warnings={loaded.validation.issues.filter((i) => i.level === "warning")}
          onDaily={startDaily}
          onCram={startCram}
          onManage={openManage}
          onQuiz={() => setView("quiz")}
        />
      )}
      {view === "manage" &&
        (() => {
          const ref = deckFiles.find((f) => f.path === manageDeckPath);
          return ref ? (
            <DeckManager
              deckRef={ref}
              saving={savingDeck}
              onSaveCard={(card, isNew) => saveCard(ref.path, card, isNew)}
              onDeleteCard={(id) => removeCard(ref.path, id)}
              onBack={() => setView("dashboard")}
            />
          ) : null;
        })()}
      {view === "study" && session && (
        <StudySession cards={session.cards} title={session.title} onGrade={onGrade} onExit={endSession} />
      )}
      {view === "quiz" && loaded && <QuizSession cards={cards} onExit={() => setView("dashboard")} />}
    </div>
  );
}

// --- pieces ---------------------------------------------------------------

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: "48px 0", opacity: 0.7 }}>{children}</div>;
}

function Header({
  user,
  repo,
  dirty,
  syncing,
  onSync,
  onChangeRepo,
  onSignOut,
  onHome
}: {
  user: GitHubUser | null;
  repo: Repo | null;
  dirty: number;
  syncing: boolean;
  onSync: () => void;
  onChangeRepo: () => void;
  onSignOut: () => void;
  onHome: () => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--fg)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>hippocampus</h1>
        </button>
        {repo && (
          <span style={{ fontSize: 13, opacity: 0.6 }}>
            {repo.full_name}
            {repo.private ? " · private" : ""}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
        {user && repo && (
          <Btn onClick={onSync} disabled={dirty === 0 || syncing} variant={dirty > 0 ? "primary" : "ghost"} style={{ padding: "6px 12px" }}>
            {syncing ? "Syncing…" : dirty > 0 ? `Sync (${dirty})` : "Synced"}
          </Btn>
        )}
        {user && repo && (
          <Btn onClick={onChangeRepo} style={{ padding: "6px 12px" }}>
            Change repo
          </Btn>
        )}
        {user && <span style={{ opacity: 0.7 }}>@{user.login}</span>}
        {user && (
          <Btn onClick={onSignOut} style={{ padding: "6px 12px" }}>
            Sign out
          </Btn>
        )}
        <LightSwitch />
      </div>
    </div>
  );
}

function Gate({ busy, onSubmit }: { busy: boolean; onSubmit: (t: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20, opacity: 0.85 }}>
        A spaced-repetition study front-end for <em>your own</em> GitHub repos. Point it at any repo that follows the{" "}
        <a
          href="https://github.com/dependanz/dependanz.github.io/blob/main/app/hippocampus/core/HIPPOCAMPUS_FORMAT.md"
          target="_blank"
          rel="noreferrer"
          style={{ color: ACCENT }}
        >
          Hippocampus deck format
        </a>{" "}
        and it becomes a review dashboard — progress is committed straight back to the repo, so it syncs across devices.
      </p>
      <Panel>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Sign in with a fine-grained personal access token
        </label>
        <input
          type="password"
          value={value}
          placeholder="github_pat_…"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit(value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--ring)",
            background: "var(--bg)",
            color: "var(--fg)",
            fontSize: 14,
            fontFamily: "inherit"
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Btn variant="primary" onClick={() => onSubmit(value)} disabled={busy || !value.trim()}>
            {busy ? "Checking…" : "Continue"}
          </Btn>
          <a href={PAT_URL} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: ACCENT }}>
            Create a token →
          </a>
        </div>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 14, lineHeight: 1.6 }}>
          Grant <strong>Repository access</strong> to the repos you want to study, with the{" "}
          <strong>Contents</strong> permission set to <strong>Read and write</strong> (read-only works if you don&apos;t
          need to save progress). The token is kept only in this browser tab (sessionStorage), is never committed, and is
          cleared when you sign out or close the tab.
        </p>
      </Panel>
    </div>
  );
}

function Picker({
  repos,
  busy,
  onOpen,
  onManual
}: {
  repos: Repo[];
  busy: boolean;
  onOpen: (r: Repo) => void;
  onManual: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const [manual, setManual] = useState("");
  const filtered = useMemo(
    () => (q ? repos.filter((r) => r.full_name.toLowerCase().includes(q.toLowerCase())) : repos),
    [repos, q]
  );

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Pick a repo to study</h2>

      <input
        value={q}
        placeholder="Filter your repos…"
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--ring)",
          background: "var(--bg)",
          color: "var(--fg)",
          fontSize: 14,
          marginBottom: 14
        }}
      />

      {busy && repos.length === 0 ? (
        <Centered>Loading your repos…</Centered>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
          {filtered.map((r) => (
            <button
              key={r.full_name}
              onClick={() => onOpen(r)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--ring)",
                background: "transparent",
                color: "var(--fg)",
                cursor: "pointer",
                fontSize: 14,
                textAlign: "left"
              }}
            >
              <span>{r.full_name}</span>
              <span style={{ fontSize: 11, opacity: 0.55 }}>{r.private ? "private" : "public"}</span>
            </button>
          ))}
          {filtered.length === 0 && <Centered>No repos match “{q}”.</Centered>}
        </div>
      )}

      <div style={{ marginTop: 20, borderTop: "1px solid var(--ring)", paddingTop: 16 }}>
        <label style={{ fontSize: 13, opacity: 0.7 }}>…or open one directly</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={manual}
            placeholder="owner/repo"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onManual(manual)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--ring)",
              background: "var(--bg)",
              color: "var(--fg)",
              fontSize: 14
            }}
          />
          <Btn onClick={() => onManual(manual)} disabled={!manual.trim()}>
            Open
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Invalid({ loaded, onBack }: { loaded: LoadedRepo; onBack: () => void }) {
  const errors = loaded.validation.issues.filter((i) => i.level === "error");
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
        {loaded.repo.full_name} isn&apos;t a valid Hippocampus repo
      </h2>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
        Expected deck files under <code>learning/decks/</code>. Fix these and re-open:
      </p>
      <Panel style={{ borderColor: "#ef4444" }}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
          {errors.length === 0 && <li>No deck files found under learning/decks/.</li>}
          {errors.slice(0, 40).map((e, i) => (
            <li key={i}>
              <code>{e.where}</code> — {e.message}
            </li>
          ))}
        </ul>
      </Panel>
      <div style={{ marginTop: 16 }}>
        <Btn onClick={onBack}>← Pick another repo</Btn>
      </div>
    </div>
  );
}
