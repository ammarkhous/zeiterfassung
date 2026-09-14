'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  const { customers, addCustomer, updateCustomer, toggleActive, deleteCustomer } = useCustomers();
  const { sessionTypes, addSessionType, updateSessionType, deleteSessionType } = useSessionTypes();
  const { showToast } = useToast();
  const router = useRouter();

  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');

  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');

  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeLabel, setEditTypeLabel] = useState('');

  const handleAddCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newRate) return;
    await addCustomer(newName, parseFloat(newRate.replace(',', '.')));
    setNewName('');
    setNewRate('');
    showToast('Kunde hinzugefügt', 'success');
  };

  const startEditCustomer = (id: string, name: string, rate: number) => {
    setEditingCustomerId(id);
    setEditName(name);
    setEditRate(rate.toString());
  };

  const saveEditCustomer = async () => {
    if (!editingCustomerId) return;
    await updateCustomer(editingCustomerId, {
      name: editName,
      ae_rate: parseFloat(editRate.replace(',', '.')),
    });
    setEditingCustomerId(null);
    showToast('Kunde aktualisiert', 'success');
  };

  const handleDeleteCustomer = async (id: string) => {
    const result = await deleteCustomer(id);
    if (!result.success) {
      showToast(result.error ?? 'Fehler', 'error');
    } else {
      showToast('Kunde gelöscht', 'success');
    }
  };

  const handleAddType = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTypeLabel) return;
    await addSessionType(newTypeLabel);
    setNewTypeLabel('');
    showToast('Typ hinzugefügt', 'success');
  };

  const startEditType = (id: string, label: string) => {
    setEditingTypeId(id);
    setEditTypeLabel(label);
  };

  const saveEditType = async () => {
    if (!editingTypeId) return;
    await updateSessionType(editingTypeId, editTypeLabel);
    setEditingTypeId(null);
    showToast('Typ aktualisiert', 'success');
  };

  const handleDeleteType = async (id: string) => {
    const result = await deleteSessionType(id);
    if (!result.success) {
      showToast(result.error ?? 'Fehler', 'error');
    } else {
      showToast('Typ gelöscht', 'success');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-xl font-semibold text-text">Einstellungen</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Kunden
        </h2>

        <form onSubmit={handleAddCustomer} className="mb-4 flex flex-wrap items-end gap-3">
          <Input
            label="Name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="AE-Satz (€/AE) *"
            type="number"
            step="0.01"
            min="0"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            required
          />
          <Button type="submit">Kunden hinzufügen</Button>
        </form>

        <div className="overflow-hidden rounded-md border border-border">
          {customers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">Noch keine Kunden.</p>
          ) : (
            customers.map((c) =>
              editingCustomerId === c.id ? (
                <div
                  key={c.id}
                  className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-2 px-4 py-3 last:border-b-0"
                >
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input
                    type="number"
                    step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                  />
                  <Button size="sm" onClick={saveEditCustomer}>
                    Speichern
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingCustomerId(null)}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text">{c.name}</p>
                    <p className="text-xs text-text-muted">
                      {c.ae_rate.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/AE
                    </p>
                  </div>
                  <Badge variant={c.active ? 'success' : 'default'}>
                    {c.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEditCustomer(c.id, c.name, c.ae_rate)}
                    >
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleActive(c.id)}>
                      {c.active ? 'Deaktivieren' : 'Aktivieren'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteCustomer(c.id)}>
                      Löschen
                    </Button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Session-Typen
        </h2>

        <form onSubmit={handleAddType} className="mb-4 flex flex-wrap items-end gap-3">
          <Input
            label="Bezeichnung *"
            value={newTypeLabel}
            onChange={(e) => setNewTypeLabel(e.target.value)}
            required
          />
          <Button type="submit">Typ hinzufügen</Button>
        </form>

        <div className="overflow-hidden rounded-md border border-border">
          {sessionTypes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">Noch keine Typen.</p>
          ) : (
            sessionTypes.map((s) =>
              editingTypeId === s.id ? (
                <div
                  key={s.id}
                  className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-2 px-4 py-3 last:border-b-0"
                >
                  <Input value={editTypeLabel} onChange={(e) => setEditTypeLabel(e.target.value)} />
                  <Button size="sm" onClick={saveEditType}>
                    Speichern
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingTypeId(null)}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2"
                >
                  <p className="text-sm text-text">{s.label}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEditType(s.id, s.label)}>
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteType(s.id)}>
                      Löschen
                    </Button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>

      <Button variant="danger" className="border border-danger bg-transparent md:hidden" onClick={handleLogout}>
        Abmelden
      </Button>
    </div>
  );
}
