import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X, RefreshCw, Trash2 } from "lucide-react";
import axios, { API } from "@/lib/api";
import { fmt } from "@/lib/format";
import { LEDGER_SCHEMAS } from "./schemas";

function useLedger(kind) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/ledger/${kind}`);
      setItems(r.data.items || []);
    } catch (e) {
      console.error(`ledger ${kind} load failed`, e);
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  const create = useCallback(async (payload) => {
    try {
      await axios.post(`${API}/ledger/${kind}`, payload);
      toast.success("Saved");
      load();
      return true;
    } catch (e) {
      console.error(`ledger ${kind} create failed`, e);
      toast.error("Save failed");
      return false;
    }
  }, [kind, load]);

  const remove = useCallback(async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/ledger/${kind}/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      console.error(`ledger ${kind} delete failed`, e);
      toast.error("Delete failed");
    }
  }, [kind, load]);

  useEffect(() => { load(); }, [load]);
  return { items, loading, create, remove, refresh: load };
}

function FormField({ field, value, onChange, kind }) {
  const Tag = field.type === "textarea" ? "textarea" : "input";
  const extraProps = field.type === "textarea"
    ? { rows: 3 }
    : { type: field.type };
  const handle = (e) => {
    const v = e.target.value;
    if (field.type === "number") {
      onChange(v === "" ? "" : Number(v));
    } else {
      onChange(v);
    }
  };
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest font-bold block mb-1" style={{ color: "var(--inkSoft)" }}>
        {field.label}{field.required && <span style={{ color: "var(--loss)" }}> *</span>}
      </label>
      <Tag className="input-base" value={value || ""}
           onChange={handle} data-testid={`field-${kind}-${field.key}`} {...extraProps} />
    </div>
  );
}

function AddForm({ schema, kind, onSubmit, onCancel }) {
  const [form, setForm] = useState({});
  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = () => {
    for (const f of schema.fields) {
      if (f.required && !form[f.key]) {
        toast.error(`${f.label} required`);
        return;
      }
    }
    onSubmit(form).then(ok => { if (ok) { setForm({}); onCancel(); } });
  };
  return (
    <div className="card-wine p-5 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schema.fields.map(f => (
          <FormField key={f.key} field={f} value={form[f.key]} kind={kind}
                     onChange={v => setField(f.key, v)} />
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={submit} className="btn-primary" data-testid={`ledger-save-${kind}`}>Save Entry</button>
      </div>
    </div>
  );
}

function LedgerHeader({ schema, kind, count, showAdd, setShowAdd, onRefresh, loading }) {
  const Icon = schema.icon;
  return (
    <div className="card-wine p-5 mb-5 flex items-center justify-between flex-wrap gap-3 gradient-hero">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: "var(--wine700)" }} />
        <h2 className="serif text-2xl">{schema.label}</h2>
        <span className="chip chip-neutral">{count}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setShowAdd(s => !s)} className="btn-primary" data-testid={`ledger-add-${kind}`}>
          {showAdd ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Entry</>}
        </button>
        <button onClick={onRefresh} className="btn-ghost">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

function LedgerTable({ schema, kind, items, loading, onRemove }) {
  return (
    <div className="card-wine overflow-x-auto">
      <table className="tl">
        <thead>
          <tr>
            {schema.fields.slice(0, 5).map(f => <th key={f.key}>{f.label}</th>)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={schema.fields.length + 1} style={{ textAlign: "center", padding: 32, color: "var(--inkSoft)" }}>
                No entries yet. Click &quot;Add Entry&quot; to start.
              </td>
            </tr>
          )}
          {items.map(it => (
            <tr key={it.id} data-testid={`ledger-row-${kind}-${it.id}`}>
              {schema.fields.slice(0, 5).map(f => (
                <td key={f.key} className={f.type === "number" ? "mono" : ""}>
                  {f.type === "number" ? fmt(it[f.key]) : (it[f.key] || "—")}
                </td>
              ))}
              <td>
                <button onClick={() => onRemove(it.id)} className="btn-ghost"
                        style={{ padding: 4, color: "var(--loss)" }}
                        data-testid={`ledger-delete-${kind}-${it.id}`}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LedgerSection({ kind }) {
  const schema = LEDGER_SCHEMAS[kind];
  const [showAdd, setShowAdd] = useState(false);
  const { items, loading, create, remove, refresh } = useLedger(kind);

  return (
    <div className="fade-in" data-testid={`ledger-${kind}`}>
      <LedgerHeader schema={schema} kind={kind} count={items.length}
                    showAdd={showAdd} setShowAdd={setShowAdd}
                    onRefresh={refresh} loading={loading} />
      {showAdd && (
        <AddForm schema={schema} kind={kind} onSubmit={create} onCancel={() => setShowAdd(false)} />
      )}
      <LedgerTable schema={schema} kind={kind} items={items} loading={loading} onRemove={remove} />
    </div>
  );
}
