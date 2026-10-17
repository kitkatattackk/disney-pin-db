"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Pin, SavedPin, ScanRecord, Tab } from "@/lib/pin-types";
import { Icon } from "./icons";
import { PinCard } from "./pin-card";
import { PinDetail } from "./pin-detail";
import { parsePersonalData } from "@/lib/personal-data";

type Report = { pins: number; pinsWithImages: number };
const navigation: { key: Tab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "explore", label: "Explore" },
  { key: "scan", label: "Scan" },
  { key: "collection", label: "Collection" },
  { key: "history", label: "History" },
];
export function PinApp({ user }: { user: { id: string; email: string } }) {
  const [tab, setTab] = useState<Tab>("home");
  const [report, setReport] = useState<Report | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pins, setPins] = useState<Pin[]>([]);
  const [demoPins, setDemoPins] = useState<Pin[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Pin | null>(null);
  const store = `pinfolio:${user.id}`;
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(store);
      const value = raw
        ? parsePersonalData(JSON.parse(raw))
        : { saved: {}, history: [] };
      return { ...value, error: "" };
    } catch {
      return {
        saved: {} as Record<string, SavedPin>,
        history: [] as ScanRecord[],
        error: "Saved data could not be read on this browser.",
      };
    }
  });
  const [saved, setSaved] = useState(initial.saved);
  const [history, setHistory] = useState(initial.history);
  const [storageError, setStorageError] = useState(initial.error);
  function persist(
    nextSaved: Record<string, SavedPin>,
    nextHistory: ScanRecord[],
  ) {
    try {
      localStorage.setItem(
        store,
        JSON.stringify({ version: 1, saved: nextSaved, history: nextHistory }),
      );
      setStorageError("");
    } catch {
      setStorageError(
        "This browser could not save your collection. Export a backup before closing.",
      );
    }
  }
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [scanReady, setScanReady] = useState(false);
  const [matches, setMatches] = useState<Pin[] | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<
    "all" | "owned" | "wanted"
  >("all");
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
    });
    if (response.status === 401) {
      window.location.reload();
      throw new Error("Please sign in again.");
    }
    return response;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api("/api/demo-pins", { signal: controller.signal }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setDemoPins(j.pins);
      }),
      api("/api/auto-build", { signal: controller.signal }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setReport(j);
      }),
      api("/api/scan", { signal: controller.signal }).then(async (r) => {
        const j = await r.json();
        if (r.ok) setScanReady(j.ready);
      }),
    ]).catch((e) => {
      if (e.name !== "AbortError") setError(e.message);
    });
    return () => controller.abort();
  }, [api]);
  useEffect(() => {
    const controller = new AbortController();
    api("/api/scrape-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinName: search, page }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setPins(j.pins);
        setTotal(j.count);
        setBusy(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, [api, search, page]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function find(value: string) {
    setTab("explore");
    if (search !== value || page !== 0) setBusy(true);
    setSearch(value);
    setQuery(value);
    setPage(0);
    setError("");
  }
  function save(pin: Pin, status: "owned" | "wanted" | null) {
    const next = { ...saved };
    if (status)
      next[pin.id] = { pin, status, addedAt: new Date().toISOString() };
    else delete next[pin.id];
    setSaved(next);
    persist(next, history);
  }
  function choose(pin: Pin, fromScan = false) {
    setSelected(pin);
    if (fromScan) {
      const next = [{ pin, date: new Date().toISOString() }, ...history].slice(
        0,
        100,
      );
      setHistory(next);
      persist(saved, next);
    }
  }
  async function choosePhoto(file?: File) {
    if (!file) return;
    setError("");
    setMatches(null);
    setScanMessage("");
    try {
      if (file.size > 20_000_000)
        throw new Error("Choose a photo smaller than 20 MB.");
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This browser cannot prepare the photo.");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Unable to prepare image.")),
          "image/jpeg",
          0.85,
        ),
      );
      if (blob.size > 3_000_000) throw new Error("Try a smaller photo.");
      const prepared = new File([blob], "pin.jpg", { type: "image/jpeg" });
      setPhoto(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Use a JPEG, PNG, or WebP photo.",
      );
    }
  }
  async function scan() {
    if (!photo) return;
    setBusy(true);
    setError("");
    setScanMessage("Looking closely at your pin…");
    setMatches(null);
    try {
      const form = new FormData();
      form.append("photo", photo);
      const r = await api("/api/scan", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMatches(j.matches);
      setScanMessage(j.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to match this photo.");
      setScanMessage("");
    } finally {
      setBusy(false);
    }
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              saved,
              history,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "pinfolio-collection.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error("Backup is too large.");
      const imported = parsePersonalData(JSON.parse(await file.text()));
      const next = { ...saved, ...imported.saved };
      const nextHistory = [...history, ...imported.history]
        .filter(
          (item, index, all) =>
            all.findIndex(
              (other) =>
                other.pin.id === item.pin.id && other.date === item.date,
            ) === index,
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 100);
      setSaved(next);
      setHistory(nextHistory);
      persist(next, nextHistory);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to restore backup.");
    }
  }
  const owned = Object.values(saved).filter((p) => p.status === "owned");
  const wanted = Object.values(saved).filter((p) => p.status === "wanted");
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="wordmark" onClick={() => setTab("home")}>
          <span className="brand-dot">
            <Icon name="scan" size={20} />
          </span>
          Pinfolio<span className="personal-label">PERSONAL</span>
        </button>
        <button
          className="icon-button"
          aria-label="Sign out"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.reload();
          }}
        >
          <Icon name="logout" size={20} />
        </button>
      </header>
      <main className="app-main">
        {(error || storageError) && (
          <p role="alert" className="notice error">
            {error || storageError}
          </p>
        )}
        {tab === "home" && (
          <>
            <section className="greeting">
              <p className="eyebrow">A LITTLE MAGIC, ALL YOURS</p>
              <h1>
                Hi, Connor<span className="greeting-dot">.</span>
              </h1>
              <p>Every pin has a story. Find your next one.</p>
            </section>
            <section className="scan-banner">
              <div>
                <p className="eyebrow">SCAN · DISCOVER · COLLECT</p>
                <h2>
                  Meet your next
                  <br />
                  favorite pin.
                </h2>
                <button className="button light" onClick={() => setTab("scan")}>
                  Scan a pin
                  <Icon name="arrow" size={18} />
                </button>
              </div>
              <div className="banner-art">
                <Icon name="scan" size={92} />
                <span>✦</span>
              </div>
            </section>
            <div className="collection-stats">
              <div>
                <strong>{owned.length}</strong>
                <span>My pins</span>
              </div>
              <div>
                <strong>{wanted.length}</strong>
                <span>Wishlist</span>
              </div>
              <div>
                <strong>{history.length}</strong>
                <span>Scan history</span>
              </div>
            </div>
            <div className="section-heading">
              <h2>Quick actions</h2>
              <span>YOUR COLLECTOR TOOLKIT</span>
            </div>
            <div className="quick-actions">
              {[
                {
                  tab: "scan" as Tab,
                  title: "Scan a pin",
                  text: "Take a photo or choose one",
                  icon: "scan",
                  color: "peach",
                },
                {
                  tab: "collection" as Tab,
                  title: "My collection",
                  text: "Your pins, in one place",
                  icon: "collection",
                  color: "blue",
                },
                {
                  tab: "explore" as Tab,
                  title: "Explore pins",
                  text: `${report?.pins.toLocaleString() || "16,287"} catalog listings`,
                  icon: "explore",
                  color: "lavender",
                },
                {
                  tab: "history" as Tab,
                  title: "Scan history",
                  text: "Revisit your confirmed matches",
                  icon: "history",
                  color: "mint",
                },
              ].map((a) => (
                <button key={a.tab} onClick={() => setTab(a.tab)}>
                  <span className={`action-icon ${a.color}`}>
                    <Icon name={a.icon} />
                  </span>
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                  <span className="action-arrow">
                    <Icon name="arrow" size={18} />
                  </span>
                </button>
              ))}
            </div>
            <div className="section-heading">
              <h2>Try the live demo</h2>
              <button className="text-link" onClick={() => find("")}>
                View all ↗
              </button>
            </div>
            <div className="topic-chips">
              {[
                "Mickey",
                "Stitch",
                "Haunted Mansion",
                "Princess",
                "Star Wars",
                "Loungefly",
              ].map((t) => (
                <button key={t} onClick={() => find(t)}>
                  {t}
                </button>
              ))}
            </div>
            <p className="demo-intro">Real pins and linked images from your database. Open one to explore its details, save it to your collection, and check eBay.</p>
            <div className="pin-grid home-grid">
              {demoPins.map((p) => (
                  <PinCard key={p.id} pin={p} onSelect={choose} />
                ))}
            </div>
          </>
        )}
        {tab === "explore" && (
          <>
            <div className="page-heading">
              <p className="eyebrow">FIND YOUR FAVORITES</p>
              <h1>Explore pins</h1>
              <p>Search your pin catalog.</p>
            </div>
            <form
              className="search-form"
              onSubmit={(e) => {
                e.preventDefault();
                find(query.trim());
              }}
            >
              <Icon name="explore" />
              <input
                aria-label="Search catalog"
                type="search"
                placeholder="Character, attraction, or series…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            <div className="section-heading">
              <p role="status">
                {busy
                  ? "Loading…"
                  : `${total.toLocaleString()} pins · Page ${page + 1}`}
              </p>
              <div className="pager">
                <button
                  disabled={busy || page === 0}
                  onClick={() => {
                    setBusy(true);
                    setPage(page - 1);
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={busy || (page + 1) * 48 >= total}
                  onClick={() => {
                    setBusy(true);
                    setPage(page + 1);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
            {!busy && !pins.length && (
              <div className="empty-state">
                <h2>No pins found</h2>
                <p>Try a character name or a shorter search.</p>
              </div>
            )}
            <div className="pin-grid" aria-busy={busy}>
              {pins.map((p) => (
                <PinCard key={p.id} pin={p} onSelect={choose} />
              ))}
            </div>
          </>
        )}
        {tab === "scan" && (
          <>
            <div className="page-heading">
              <p className="eyebrow">ONE PIN. A WORLD OF STORIES.</p>
              <h1>Scan a pin</h1>
              <p>Center one pin, fill the frame, and avoid glare.</p>
            </div>
            <div className="scan-layout">
              <section>
                <div className={`camera-stage ${preview ? "has-photo" : ""}`}>
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Your selected pin photo"
                      fill
                      unoptimized
                      sizes="550px"
                      className="object-contain"
                    />
                  ) : (
                    <>
                      <Icon name="scan" size={72} />
                      <h2>What did you find?</h2>
                      <p>Choose a clear photo of the front of your pin.</p>
                    </>
                  )}
                  <div className="frame-corners" />
                </div>
                <div className="photo-actions">
                  <button
                    className="button secondary"
                    onClick={() => camera.current?.click()}
                  >
                    <Icon name="scan" size={18} />
                    Take photo
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => upload.current?.click()}
                  >
                    <Icon name="upload" size={18} />
                    Upload photo
                  </button>
                </div>
                <input
                  ref={camera}
                  hidden
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    choosePhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={upload}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    choosePhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  className="button primary full-width"
                  disabled={!photo || !scanReady || busy}
                  onClick={scan}
                >
                  {busy ? "Finding possible matches…" : "Find my pin"}
                  <Icon name="arrow" size={18} />
                </button>
              </section>
              <aside className="scan-guidance">
                <h2>
                  A better photo,
                  <br />a better match.
                </h2>
                <ol>
                  <li>Photograph one pin at a time.</li>
                  <li>Use soft light and a plain background.</li>
                  <li>Keep the pin upright and in focus.</li>
                  <li>Confirm the edition before saving.</li>
                </ol>
                {!scanReady && (
                  <div className="notice">
                    <strong>Photo recognition needs setup</strong>
                    <p>
                      The photo input is ready. Connect an AI Gateway key and
                      vision model to enable automatic matching.
                    </p>
                  </div>
                )}
                <p className="fine-print">
                  Photos are not saved. When matching is enabled, the selected
                  photo is sent to the configured AI service.
                </p>
                <button className="text-link" onClick={() => find("")}>
                  Search the catalog by name instead ↗
                </button>
              </aside>
            </div>
            {scanMessage && (
              <p role="status" className="notice">
                {scanMessage}
              </p>
            )}
            {matches && (
              <>
                <div className="section-heading">
                  <h2>Possible matches</h2>
                  <span>CONFIRM THE RIGHT PIN</span>
                </div>
                <div className="pin-grid">
                  {matches.map((p) => (
                    <PinCard
                      key={p.id}
                      pin={p}
                      onSelect={(p) => choose(p, true)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {tab === "collection" && (
          <>
            <div className="page-heading">
              <p className="eyebrow">THE STORIES YOU KEEP</p>
              <h1>My collection</h1>
              <p>Saved on this browser. Export a backup to keep a copy.</p>
            </div>
            <div className="collection-toolbar">
              <div className="topic-chips">
                {(["all", "owned", "wanted"] as const).map((f) => (
                  <button
                    key={f}
                    aria-pressed={collectionFilter === f}
                    onClick={() => setCollectionFilter(f)}
                  >
                    {f === "all"
                      ? "All pins"
                      : f === "owned"
                        ? "Owned"
                        : "Wishlist"}
                  </button>
                ))}
              </div>
              <div className="backup-controls">
                <button className="text-link" onClick={exportBackup}>
                  Export backup
                </button>
                <label className="text-link">
                  Restore backup
                  <input
                    hidden
                    type="file"
                    accept="application/json"
                    onChange={(e) => {
                      importBackup(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {!Object.keys(saved).length ? (
              <div className="empty-state">
                <Icon name="collection" size={42} />
                <h2>Room for a little magic.</h2>
                <p>Open a pin and add it to your collection or wishlist.</p>
                <button className="button primary" onClick={() => find("")}>
                  Explore pins
                </button>
              </div>
            ) : (
              <div className="pin-grid">
                {Object.values(saved)
                  .filter(
                    (p) =>
                      collectionFilter === "all" ||
                      p.status === collectionFilter,
                  )
                  .map((p) => (
                    <PinCard key={p.pin.id} pin={p.pin} onSelect={choose} />
                  ))}
              </div>
            )}
          </>
        )}
        {tab === "history" && (
          <>
            <div className="page-heading">
              <p className="eyebrow">YOUR RECENT DISCOVERIES</p>
              <h1>Scan history</h1>
              <p>
                Matches you chose from photo results, saved on this browser.
              </p>
            </div>
            {!history.length ? (
              <div className="empty-state">
                <Icon name="history" size={42} />
                <h2>Your next discovery starts here.</h2>
                <p>Confirmed photo matches will appear in your history.</p>
                <button
                  className="button primary"
                  onClick={() => setTab("scan")}
                >
                  Scan a pin
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map((h, i) => (
                  <button key={`${h.date}-${i}`} onClick={() => choose(h.pin)}>
                    <Icon name="check" />
                    <div>
                      <h3>{h.pin.name}</h3>
                      <p>{new Date(h.date).toLocaleString()}</p>
                    </div>
                    <Icon name="arrow" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <footer className="app-footer">
          Personal collection ·{" "}
          {user.email}
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map((n) => (
          <button
            key={n.key}
            aria-current={tab === n.key ? "page" : undefined}
            className={tab === n.key ? "active" : ""}
            onClick={() => {
              setTab(n.key);
              setError("");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          >
            <span>
              <Icon name={n.key} />
            </span>
            {n.label}
          </button>
        ))}
      </nav>
      {selected && (
        <PinDetail
          key={selected.id}
          pin={selected}
          saved={saved[selected.id]}
          api={api}
          onSave={save}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
