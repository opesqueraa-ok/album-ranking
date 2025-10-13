/*! Minimal IndexedDB wrapper for Album Rater v7.1
   - Nuevo nombre de BD para evitar colisiones de caché antiguas
   - Migración desde esquemas previos (v6.x) si existen
   - Índices útiles para ordenación (fecha, promedio, título)
   - Utilidades extra: getBySort, clearAll, exportAll, importAll
*/
(function () {
  const DB_NAME = "albumrater-db-v7";
  const DB_VER  = 2;
  const STORE   = "albums";

  // --- helpers ---
  function uuid() {
    // RFC4122-ish uuid v4
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
      .replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c / 4)).toString(16)
      );
  }

  function isFiniteNum(v) { return typeof v === "number" && Number.isFinite(v); }

  function computeAvg(tracks = []) {
    const vals = tracks.map(t => Number(t?.score)).filter(isFiniteNum);
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Number(avg.toFixed(2));
  }

  // --- open / upgrade ---
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);

      req.onupgradeneeded = (e) => {
        const db = req.result;

        // Crear store si no existe (v1+)
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("by_createdAt", "createdAt");
          os.createIndex("by_updatedAt", "updatedAt");
          os.createIndex("by_avgScore", "avgScore");
          os.createIndex("by_title", "album");
        } else if (e.oldVersion < 2) {
          // v2: asegurar índices (idempotente en la práctica por try/catch)
          const os = req.transaction.objectStore(STORE);
          try { os.createIndex("by_createdAt", "createdAt"); } catch {}
          try { os.createIndex("by_updatedAt", "updatedAt"); } catch {}
          try { os.createIndex("by_avgScore", "avgScore"); } catch {}
          try { os.createIndex("by_title", "album"); } catch {}
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function tx(mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      const p = fn(s);
      t.oncomplete = () => resolve(p);
      t.onerror    = () => reject(t.error);
      t.onabort    = () => reject(t.error);
    });
  }

  // --- CRUD ---
  async function upsert(album) {
    const now = Date.now();
    const a = { ...album };
    if (!a.id) a.id = uuid();
    if (!a.createdAt) a.createdAt = now;
    a.updatedAt = now;

    // Compat: si no viene avgScore, lo calculamos desde tracks
    if (!isFiniteNum(a.avgScore)) {
      a.avgScore = computeAvg(a.tracks || []);
    }
    return tx("readwrite", s => s.put(a));
  }

  async function getAll() {
    return tx("readonly", s => new Promise((resolve) => {
      const res = [];
      const req = s.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) { res.push(cur.value); cur.continue(); }
        else resolve(res);
      };
    }));
  }

  async function getOne(id) {
    return tx("readonly", s => new Promise((resolve, reject) => {
      const req = s.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    }));
  }

  async function remove(id) {
    return tx("readwrite", s => s.delete(id));
  }

  async function clearAll() {
    return tx("readwrite", s => s.clear());
  }

  // --- Bulk / Import / Export ---
  async function bulkImport(albums = []) {
    return tx("readwrite", s => {
      albums.forEach(raw => {
        const a = { ...raw };
        if (!a.id) a.id = uuid();
        if (!a.createdAt) a.createdAt = Date.now();
        if (!a.updatedAt) a.updatedAt = a.createdAt;
        if (!isFiniteNum(a.avgScore)) a.avgScore = computeAvg(a.tracks || []);
        s.put(a);
      });
    });
  }

  async function exportAll() {
    const all = await getAll();
    return JSON.parse(JSON.stringify(all));
  }

  async function importAll(list = [], { wipe = false } = {}) {
    if (wipe) await clearAll();
    await bulkImport(list);
  }

  // --- Queries con ordenación común ---
  // sort: 'new' | 'score_desc' | 'score_asc' | 'alpha'
  async function getBySort(sort = "new") {
    const all = await getAll();

    // Asegurar avgScore calculado (por si vienen registros antiguos)
    all.forEach(a => {
      if (!isFiniteNum(a.avgScore)) a.avgScore = computeAvg(a.tracks || []);
    });

    switch (sort) {
      case "score_desc":
        return all.sort((a, b) => (b.avgScore ?? -Infinity) - (a.avgScore ?? -Infinity)
          || (b.createdAt ?? 0) - (a.createdAt ?? 0));
      case "score_asc":
        return all.sort((a, b) => (a.avgScore ?? Infinity) - (b.avgScore ?? Infinity)
          || (b.createdAt ?? 0) - (a.createdAt ?? 0));
      case "alpha":
        return all.sort((a, b) => String(a.album || "").localeCompare(String(b.album || ""), undefined, { sensitivity: "base" }));
      case "new":
      default:
        return all.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  }

  // --- Expose ---
  window.AlbumDB = {
    // CRUD
    upsert, getAll, getOne, remove, clearAll,
    // Bulk / I/O
    bulkImport, exportAll, importAll,
    // Queries
    getBySort,
    // Utils
    _computeAvg: computeAvg,
    _openDB: openDB,
    _version: DB_VER,
    _name: DB_NAME
  };
})();
```0
