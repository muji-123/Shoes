import { useState, useRef, useEffect } from "react";

const STORAGE_KEY = "sole_vault_shoes";

const initialShoes = [
  { id: 1, name: "Air Jordan 1 Retro High OG", brand: "Nike", year: "2023", size: "US 10", colorway: "Chicago", tag: "經典", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
  { id: 2, name: "Yeezy Boost 350 V2", brand: "Adidas", year: "2022", size: "US 9.5", colorway: "Zebra", tag: "聯名", image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80" },
  { id: 3, name: "New Balance 550", brand: "New Balance", year: "2024", size: "US 10", colorway: "White Green", tag: "日常", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80" },
];

const TAGS = ["全部", "經典", "聯名", "日常", "限定", "復古", "運動"];

function loadFromStorage() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return null;
}
function saveToStorage(shoes) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(shoes)); } catch {}
}

export default function ShoeCabinet() {
  const [shoes, setShoes] = useState(() => loadFromStorage() || initialShoes);
  const [filter, setFilter] = useState("全部");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [form, setForm] = useState({ name: "", brand: "", year: "", size: "", colorway: "", tag: "經典", image: "" });
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [toast, setToast] = useState(null);
  const [importError, setImportError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const fileRef = useRef();
  const importRef = useRef();
  const replaceRef = useRef();
  const nextId = useRef(Math.max(0, ...((loadFromStorage() || initialShoes).map(s => s.id))) + 1);

  useEffect(() => { saveToStorage(shoes); }, [shoes]);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  const filtered = shoes.filter(s => {
    const matchTag = filter === "全部" || s.tag === filter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.brand.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  function resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    resizeImage(file, (dataUrl) => {
      setPreviewImg(dataUrl);
      setForm(f => ({ ...f, image: dataUrl }));
    });
  }

  function handleAdd() {
    setShoes(prev => [...prev, { ...form, id: nextId.current++ }]);
    setForm({ name: "", brand: "", year: "", size: "", colorway: "", tag: "經典", image: "" });
    setPreviewImg(null); setShowForm(false);
    showToast("已加入收藏");
  }

  function handleDelete(id) {
    setShoes(prev => prev.filter(s => s.id !== id));
    setSelected(null); showToast("已移除收藏", "warn");
  }

  function handleEditFile(e) {
    const file = e.target.files[0]; if (!file) return;
    resizeImage(file, (dataUrl) => {
      setEditPreview(dataUrl);
      setEditForm(f => ({ ...f, image: dataUrl }));
    });
  }

  function handleSaveEdit() {
    setShoes(prev => prev.map(s => s.id === editForm.id ? editForm : s));
    setSelected(editForm);
    setEditMode(false);
    setEditForm(null);
    setEditPreview(null);
    showToast("已儲存變更");
  }

  function startEdit(shoe) {
    setEditForm({ ...shoe });
    setEditPreview(shoe.image || null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditForm(null);
    setEditPreview(null);
  }

  function exportJSON() {
    const data = { version: 1, exportedAt: new Date().toISOString(), count: shoes.length, shoes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `sole-vault-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast("備份檔案已下載");
  }

  function handleImportFile(e) {
    const file = e.target.files[0]; if (!file) return; setImportError("");
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = data.shoes || data;
        if (!Array.isArray(imported)) throw new Error();
        const valid = imported.filter(s => s.name && s.brand);
        if (!valid.length) throw new Error();
        setShoes(prev => {
          const ids = new Set(prev.map(s => s.id));
          return [...prev, ...valid.filter(s => !ids.has(s.id)).map(s => ({ ...s, id: nextId.current++ }))];
        });
        showToast(`成功載入 ${valid.length} 雙球鞋`); setShowBackup(false);
      } catch { setImportError("檔案格式不正確，請選擇正確的備份檔"); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  function replaceAllFromImport(e) {
    const file = e.target.files[0]; if (!file) return; setImportError("");
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = data.shoes || data;
        if (!Array.isArray(imported)) throw new Error();
        const valid = imported.filter(s => s.name && s.brand);
        if (!valid.length) throw new Error();
        setShoes(valid); nextId.current = Math.max(0, ...valid.map(s => s.id)) + 1;
        showToast(`已還原 ${valid.length} 雙球鞋`); setShowBackup(false);
      } catch { setImportError("檔案格式不正確，請選擇正確的備份檔"); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  return (
    <div style={S.root}>
      {/* Subtle dot pattern */}
      <div style={S.dotPattern} />

      {/* Toast */}
      {toast && <div style={{ ...S.toast, ...(toast.type === "warn" ? S.toastWarn : {}) }}>{toast.msg}</div>}

      {/* Header */}
      <header style={S.header}>
        <div style={S.logoRow}>
          <div style={S.logoMark}>👟</div>
          <div>
            <div style={S.logoTitle}>SOLE VAULT</div>
            <div style={S.logoSub}>私人球鞋展示櫃</div>
          </div>
        </div>
        <div style={S.headerRight}>
          <div style={S.countBadge}>{shoes.length} 雙</div>
          <button style={S.iconBtn} onClick={() => { setShowBackup(true); setShowForm(false); }} title="備份 / 還原">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            備份
          </button>
          <button style={S.iconBtn} onClick={() => setView(v => v === "grid" ? "shelf" : "grid")}>
            {view === "grid" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            )}
            {view === "grid" ? "列表" : "網格"}
          </button>
          <button style={S.addBtn} onClick={() => { setShowForm(true); setShowBackup(false); }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> 新增球鞋
          </button>
        </div>
      </header>

      {/* Auto-save strip */}
      <div style={S.saveBanner}>
        <span style={S.saveDot} />
        已自動儲存於瀏覽器 · 點擊「備份」可下載檔案保存
      </div>

      {/* Controls */}
      <div style={S.controlRow}>
        <div style={S.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={S.searchInput} placeholder="搜尋品牌或名稱…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={S.tags}>
          {TAGS.map(t => (
            <button key={t} style={{ ...S.tagBtn, ...(filter === t ? S.tagActive : {}) }} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {view === "grid" ? (
        <div style={S.grid}>
          {filtered.length === 0 && <div style={S.empty}>尚無球鞋，快新增你的第一雙！</div>}
          {filtered.map((shoe, i) => (
            <div key={shoe.id} style={{ ...S.card, animationDelay: `${i * 0.06}s` }} onClick={() => setSelected(shoe)}>
              <div style={S.cardImgWrap}>
                <img src={shoe.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"} alt={shoe.name} style={S.cardImg} />
                <div style={S.cardTagBadge}>{shoe.tag}</div>
              </div>
              <div style={S.cardInfo}>
                <div style={S.cardBrand}>{shoe.brand}</div>
                <div style={S.cardName}>{shoe.name}</div>
                <div style={S.cardMeta}>{[shoe.colorway, shoe.size].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={S.shelf}>
          {filtered.length === 0 && <div style={S.empty}>尚無球鞋，快新增你的第一雙！</div>}
          {filtered.map((shoe, i) => (
            <div key={shoe.id} style={{ ...S.shelfRow, animationDelay: `${i * 0.05}s` }} onClick={() => setSelected(shoe)}>
              <img src={shoe.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"} alt={shoe.name} style={S.shelfImg} />
              <div style={S.shelfInfo}>
                <span style={S.shelfBrand}>{shoe.brand}</span>
                <span style={S.shelfName}>{shoe.name}</span>
                <span style={S.shelfColorway}>{shoe.colorway}</span>
              </div>
              <div style={S.shelfRight}>
                <span style={S.shelfTagPill}>{shoe.tag}</span>
                <span style={S.shelfMeta}>{shoe.size}</span>
                <span style={S.shelfYear}>{shoe.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && !editMode && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            <div style={S.modalImgWrap}>
              <img src={selected.image || ""} alt={selected.name} style={S.modalImg} />
            </div>
            <div style={S.modalBody}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={S.modalTagPill}>{selected.tag}</div>
                <button style={S.editBtn} onClick={() => startEdit(selected)}>✏️ 編輯</button>
              </div>
              <div style={S.modalBrand}>{selected.brand}</div>
              <div style={S.modalName}>{selected.name}</div>
              <div style={S.modalDivider} />
              <div style={S.modalDetails}>
                {[["配色", selected.colorway], ["尺寸", selected.size], ["年份", selected.year]].map(([k, v]) => v && (
                  <div key={k} style={S.modalDetailRow}>
                    <span style={S.modalDetailKey}>{k}</span>
                    <span style={S.modalDetailVal}>{v}</span>
                  </div>
                ))}
              </div>
              <button style={S.deleteBtn} onClick={() => handleDelete(selected.id)}>移除收藏</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editMode && editForm && (
        <div style={S.overlay} onClick={cancelEdit}>
          <div style={S.formModal} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={cancelEdit}>✕</button>
            <div style={S.formTitle}>編輯球鞋</div>

            <div style={S.uploadArea} onClick={() => document.getElementById("edit-img-input").click()}>
              {editPreview
                ? <img src={editPreview} alt="preview" style={S.uploadPreview} />
                : <div style={S.uploadPlaceholder}>
                    <span style={{ fontSize: 28 }}>📸</span>
                    <span style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>點擊更換照片</span>
                  </div>
              }
            </div>
            <input id="edit-img-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleEditFile} />

            <div style={S.formGrid}>
              {[["name", "球鞋名稱"], ["brand", "品牌"], ["colorway", "配色"], ["size", "尺寸 (US)"], ["year", "年份"]].map(([key, label]) => (
                <div key={key} style={S.formField}>
                  <label style={S.formLabel}>{label}</label>
                  <input style={S.formInput} value={editForm[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} />
                </div>
              ))}
              <div style={S.formField}>
                <label style={S.formLabel}>標籤</label>
                <select style={S.formInput} value={editForm.tag} onChange={e => setEditForm(f => ({ ...f, tag: e.target.value }))}>
                  {TAGS.filter(t => t !== "全部").map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <button style={{ ...S.addBtn, width: "100%", marginTop: 16, justifyContent: "center" }} onClick={handleSaveEdit}>
              儲存變更
            </button>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackup && (
        <div style={S.overlay} onClick={() => setShowBackup(false)}>
          <div style={S.formModal} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={() => setShowBackup(false)}>✕</button>
            <div style={S.modalName} >💾 備份 &amp; 還原</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.7, marginBottom: 24, marginTop: 4 }}>
              資料已自動儲存於瀏覽器。若要跨裝置使用或防止遺失，請匯出備份檔案。
            </p>
            {[
              { title: "📤 匯出備份", desc: "下載 JSON 備份檔（含圖片）", action: exportJSON, label: `下載備份 · ${shoes.length} 雙球鞋`, primary: true },
            ].map(item => (
              <div key={item.title} style={S.backupBlock}>
                <div style={S.backupBlockTitle}>{item.title}</div>
                <div style={S.backupBlockDesc}>{item.desc}</div>
                <button style={item.primary ? S.addBtn : S.iconBtn} onClick={item.action}>{item.label}</button>
              </div>
            ))}
            <div style={S.modalDivider} />
            <div style={S.backupBlock}>
              <div style={S.backupBlockTitle}>📥 合併匯入</div>
              <div style={S.backupBlockDesc}>新資料與現有收藏合併，不刪除已有資料</div>
              <button style={S.iconBtn} onClick={() => importRef.current.click()}>選擇備份檔案合併</button>
              <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImportFile} />
            </div>
            <div style={S.modalDivider} />
            <div style={S.backupBlock}>
              <div style={S.backupBlockTitle}>🔄 完整還原</div>
              <div style={S.backupBlockDesc}>以備份檔覆蓋現有所有資料（現有收藏將被取代）</div>
              <button style={{ ...S.iconBtn, color: "#c0524a", borderColor: "#f5c6c6" }} onClick={() => replaceRef.current.click()}>選擇備份檔案還原</button>
              <input ref={replaceRef} type="file" accept=".json" style={{ display: "none" }} onChange={replaceAllFromImport} />
            </div>
            {importError && <div style={S.importError}>{importError}</div>}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div style={S.overlay} onClick={() => { setShowForm(false); setPreviewImg(null); }}>
          <div style={S.formModal} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={() => { setShowForm(false); setPreviewImg(null); }}>✕</button>
            <div style={S.formTitle}>新增球鞋</div>
            <div style={S.uploadArea} onClick={() => document.getElementById("shoe-img-input").click()}>
              {previewImg
                ? <img src={previewImg} alt="preview" style={S.uploadPreview} />
                : <div style={S.uploadPlaceholder}>
                    <span style={{ fontSize: 28 }}>📸</span>
                    <span style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>點擊上傳照片</span>
                  </div>
              }
            </div>
            <input id="shoe-img-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <div style={S.formGrid}>
              {[["name", "球鞋名稱"], ["brand", "品牌"], ["colorway", "配色"], ["size", "尺寸 (US)"], ["year", "年份"]].map(([key, label]) => (
                <div key={key} style={S.formField}>
                  <label style={S.formLabel}>{label}</label>
                  <input style={S.formInput} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} />
                </div>
              ))}
              <div style={S.formField}>
                <label style={S.formLabel}>標籤</label>
                <select style={S.formInput} value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                  {TAGS.filter(t => t !== "全部").map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <button style={{ ...S.addBtn, width: "100%", marginTop: 12, justifyContent: "center" }} onClick={handleAdd}>
              加入收藏
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f5f5f5; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        button:hover { opacity: 0.82; }
      `}</style>
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", background: "#fafaf8", color: "#1a1a1a", fontFamily: "'Inter', sans-serif", position: "relative" },
  dotPattern: { position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, #d8d8d0 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.45, pointerEvents: "none", zIndex: 0 },

  toast: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 500, zIndex: 999, animation: "slideDown 0.25s ease", whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" },
  toastWarn: { background: "#c0524a" },

  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 16px", borderBottom: "1px solid #ebebeb", background: "#fff", position: "relative", zIndex: 10, flexWrap: "wrap", gap: 14, boxShadow: "0 1px 0 #ebebeb" },
  logoRow: { display: "flex", alignItems: "center", gap: 14 },
  logoMark: { width: 44, height: 44, borderRadius: 12, background: "#f4f4f2", border: "1px solid #e8e8e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 },
  logoTitle: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.06em", lineHeight: 1 },
  logoSub: { fontSize: 10, color: "#bbb", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 3 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  countBadge: { background: "#f4f4f2", border: "1px solid #e8e8e4", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#888", fontWeight: 500 },
  iconBtn: { background: "#fff", border: "1px solid #e0e0dc", color: "#444", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" },
  addBtn: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "opacity 0.15s" },

  saveBanner: { display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", background: "#f0f7f0", borderBottom: "1px solid #dceadc", fontSize: 11, color: "#5a8a5a", position: "relative", zIndex: 1, letterSpacing: "0.02em" },
  saveDot: { width: 6, height: 6, borderRadius: "50%", background: "#5a8a5a", flexShrink: 0 },

  controlRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #ebebeb", position: "relative", zIndex: 1, flexWrap: "wrap" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#f7f7f5", border: "1px solid #e8e8e4", borderRadius: 8, padding: "8px 14px" },
  searchInput: { background: "transparent", border: "none", outline: "none", color: "#1a1a1a", fontSize: 13, width: 180, fontFamily: "'Inter', sans-serif" },
  tags: { display: "flex", gap: 6, flexWrap: "wrap" },
  tagBtn: { background: "#f4f4f2", border: "1px solid #e8e8e4", color: "#888", borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500, transition: "all 0.15s", fontFamily: "'Inter', sans-serif" },
  tagActive: { background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a", fontWeight: 600 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18, padding: "16px 16px", position: "relative", zIndex: 1 },
  card: { background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, overflow: "hidden", cursor: "pointer", animation: "fadeUp 0.4s ease both", transition: "box-shadow 0.2s, transform 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  cardImgWrap: { position: "relative", height: 220, background: "#f7f7f5" },
  cardImg: { width: "100%", height: "100%", objectFit: "contain", transition: "transform 0.4s" },
  cardTagBadge: { position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: "1px solid #e8e8e4", borderRadius: 6, padding: "3px 9px", fontSize: 10, color: "#444", fontWeight: 600, letterSpacing: "0.08em" },
  cardInfo: { padding: "14px 16px 16px" },
  cardBrand: { fontSize: 10, color: "#bbb", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 },
  cardName: { fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.35, marginBottom: 5 },
  cardMeta: { fontSize: 11, color: "#bbb" },

  shelf: { display: "flex", flexDirection: "column", gap: 6, padding: "24px 16px", position: "relative", zIndex: 1 },
  shelfRow: { display: "flex", alignItems: "center", gap: 18, background: "#fff", border: "1px solid #ebebeb", borderRadius: 12, padding: "12px 18px", cursor: "pointer", animation: "fadeUp 0.35s ease both", transition: "box-shadow 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  shelfImg: { width: 68, height: 68, objectFit: "contain", borderRadius: 8, background: "#f4f4f2", flexShrink: 0 },
  shelfInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  shelfBrand: { fontSize: 10, color: "#bbb", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 },
  shelfName: { fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
  shelfColorway: { fontSize: 12, color: "#ccc" },
  shelfRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 },
  shelfTagPill: { background: "#f4f4f2", border: "1px solid #e8e8e4", borderRadius: 5, padding: "2px 9px", fontSize: 10, color: "#666", fontWeight: 600 },
  shelfMeta: { fontSize: 12, color: "#aaa" },
  shelfYear: { fontSize: 11, color: "#ccc" },

  empty: { gridColumn: "1/-1", textAlign: "center", color: "#ccc", padding: "60px 0", fontSize: 14 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" },
  modal: { background: "#fff", border: "1px solid #ebebeb", borderRadius: 18, width: "100%", maxWidth: 440, overflow: "hidden", position: "relative", animation: "fadeUp 0.3s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  modalImgWrap: { background: "#f7f7f5", minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" },
  modalImg: { width: "100%", height: "100%", objectFit: "contain" },
  modalBody: { padding: "20px 24px 24px" },
  modalTagPill: { display: "inline-block", background: "#f4f4f2", border: "1px solid #e8e8e4", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#666", fontWeight: 600, marginBottom: 10, letterSpacing: "0.08em" },
  modalBrand: { fontSize: 10, color: "#bbb", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 },
  modalName: { fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1a1a1a", marginBottom: 14, lineHeight: 1.25 },
  modalDivider: { height: 1, background: "#f0f0ee", margin: "14px 0" },
  modalDetails: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  modalDetailRow: { display: "flex", justifyContent: "space-between" },
  modalDetailKey: { fontSize: 12, color: "#bbb" },
  modalDetailVal: { fontSize: 13, color: "#1a1a1a", fontWeight: 500 },
  deleteBtn: { background: "transparent", border: "1px solid #f5c6c6", color: "#c0524a", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, width: "100%", fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  closeBtn: { position: "absolute", top: 12, right: 14, background: "rgba(255,255,255,0.9)", border: "1px solid #e8e8e4", color: "#888", fontSize: 13, cursor: "pointer", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, backdropFilter: "blur(4px)" },

  formModal: { background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460, padding: "24px 22px 28px", position: "relative", animation: "fadeUp 0.3s ease", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" },
  formTitle: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 18, color: "#1a1a1a" },

  backupBlock: { marginBottom: 16 },
  backupBlockTitle: { fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 },
  backupBlockDesc: { fontSize: 12, color: "#aaa", marginBottom: 10, lineHeight: 1.5 },
  importError: { background: "#fef5f5", border: "1px solid #f5c6c6", color: "#c0524a", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginTop: 12 },

  uploadArea: { border: "1.5px dashed #d0d0cc", borderRadius: 10, height: 100, minHeight: 100, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 16, overflow: "hidden", background: "#f5f5f3", transition: "border-color 0.2s" },
  uploadPlaceholder: { display: "flex", alignItems: "center", gap: 10, color: "#bbb" },
  uploadPreview: { width: "100%", height: "100%", objectFit: "cover" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" },
  formField: { display: "flex", flexDirection: "column", gap: 5 },
  formLabel: { fontSize: 10, color: "#aaa", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 },
  formInput: { background: "#fafaf8", border: "1px solid #e8e8e4", borderRadius: 8, padding: "9px 12px", color: "#1a1a1a", fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif" },
};
