// db.v7.1.js — Minimal IndexedDB wrapper
(function(){
  const DB_NAME = 'albumrater-db';
  const DB_VER  = 2;
  const STORE   = 'albums';

  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        let os = db.objectStoreNames.contains(STORE) ? req.transaction.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: 'id' });
        if (!os.indexNames.contains('by_createdAt')) os.createIndex('by_createdAt', 'createdAt');
        if (!os.indexNames.contains('by_updatedAt')) os.createIndex('by_updatedAt', 'updatedAt');
        if (!os.indexNames.contains('by_avgScore')) os.createIndex('by_avgScore', 'avgScore');
        if (!os.indexNames.contains('by_title')) os.createIndex('by_title', 'album');
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror   = ()=> reject(req.error);
    });
  }

  async function tx(mode, fn){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const t = db.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      const p = fn(s);
      t.oncomplete = ()=> resolve(p);
      t.onerror = ()=> reject(t.error);
      t.onabort = ()=> reject(t.error);
    });
  }

  function uuid(){
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
  }

  async function upsert(album){
    if(!album.id) album.id = uuid();
    album.updatedAt = Date.now();
    if(!album.createdAt) album.createdAt = album.updatedAt;
    return tx('readwrite', s => s.put(album));
  }

  async function getAll(){
    return tx('readonly', s => new Promise((resolve)=>{
      const res = [];
      const req = s.openCursor();
      req.onsuccess = ()=>{
        const cur = req.result;
        if(cur){ res.push(cur.value); cur.continue(); }
        else resolve(res);
      };
    }));
  }

  async function getOne(id){
    return tx('readonly', s => new Promise((resolve, reject)=>{
      const req = s.get(id);
      req.onsuccess = ()=> resolve(req.result || null);
      req.onerror   = ()=> reject(req.error);
    }));
  }

  async function remove(id){
    return tx('readwrite', s => s.delete(id));
  }

  async function bulkImport(albums = []){
    return tx('readwrite', s => {
      albums.forEach(a => {
        if(!a.id) a.id = uuid();
        if(!a.createdAt) a.createdAt = Date.now();
        if(!a.updatedAt) a.updatedAt = a.createdAt;
        s.put(a);
      });
    });
  }

  window.AlbumDB = { upsert, getAll, getOne, remove, bulkImport };
})();
