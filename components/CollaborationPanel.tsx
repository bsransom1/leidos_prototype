'use client';

import { useState } from 'react';
import { Users, UserPlus, Shield, PencilSimple, Eye } from '@phosphor-icons/react';
import type { User } from '@/types';
import { fieldClass } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface CollaborationPanelProps {
  users: User[];
  currentUser: User;
  proposalId?: string;
  onAddUser?: (email: string, role: User['role']) => void;
}

export default function CollaborationPanel({
  users,
  currentUser,
  proposalId,
  onAddUser,
}: CollaborationPanelProps) {
  void proposalId;
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('viewer');

  const handleAddUser = () => {
    if (newUserEmail && onAddUser) {
      onAddUser(newUserEmail, newUserRole);
      setNewUserEmail('');
      setShowAddUser(false);
    }
  };

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3.5 w-3.5 text-blue-300" weight="bold" />;
      case 'editor':
        return <PencilSimple className="h-3.5 w-3.5 text-ds-accent" weight="bold" />;
      case 'viewer':
        return <Eye className="h-3.5 w-3.5 text-ds-text-muted" weight="bold" />;
    }
  };

  const getRoleTone = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'border-blue-800/55 bg-blue-950/40 text-blue-200';
      case 'editor':
        return 'border-blue-900/55 bg-[#132347]/85 text-blue-50';
      case 'viewer':
        return 'border-ds-border bg-ds-shell/55 text-ds-text-secondary';
    }
  };

  return (
    <div className="rounded-ds-md border border-ds-border bg-ds-shell/55 p-4 shadow-ds-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-ds-text-muted" weight="bold" aria-hidden />
          <h3 className="mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
            Collaborators
          </h3>
        </div>
        {currentUser.role === 'admin' && (
          <button
            type="button"
            onClick={() => setShowAddUser(!showAddUser)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-ds-sm border border-transparent px-2 py-1.5 text-[11px] font-semibold text-ds-info transition-colors hover:border-ds-accent/35 hover:bg-white/[0.03]"
          >
            <UserPlus className="h-3.5 w-3.5" weight="bold" aria-hidden />
            Invite viewer
          </button>
        )}
      </div>

      {showAddUser && currentUser.role === 'admin' && (
        <div className="mb-4 space-y-3 rounded-ds-md border border-ds-border bg-ds-page/40 p-3">
          <input
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="user@agency.gov"
            className={cn(fieldClass, 'text-xs')}
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as User['role'])}
            className={cn(fieldClass, 'text-xs')}
            disabled
          >
            <option value="viewer">Viewer</option>
          </select>
          <p className="mono text-[11px] text-ds-text-muted">Role matrix locked — viewer issuance only.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" className="!px-3 !py-1.5 !text-xs" onClick={handleAddUser}>
              Invite
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => {
                setShowAddUser(false);
                setNewUserEmail('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-ds-text-muted">
            Federate collaborators to share drafts with program partners.
          </div>
        ) : (
          users.map((usr) => (
            <div
              key={usr.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-ds-md border border-ds-border bg-ds-surface/50 p-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-sm border border-ds-border bg-ds-primary text-[13px] font-semibold uppercase text-white">
                  {usr.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ds-text">{usr.name}</p>
                  <p className="mono truncate text-[11px] text-ds-text-muted">{usr.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="shrink-0">{getRoleIcon(usr.role)}</span>
                <span
                  className={cn(
                    'rounded-ds-sm border px-2 py-0.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide',
                    getRoleTone(usr.role),
                  )}
                >
                  {usr.role}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
