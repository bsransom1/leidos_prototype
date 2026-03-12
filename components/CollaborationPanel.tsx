'use client';

import { useState } from 'react';
import { Users, UserPlus, Shield, Edit, Eye } from 'lucide-react';
import { User } from '@/types';

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
        return <Shield className="w-3.5 h-3.5 text-[#6b21a8]" />;
      case 'editor':
        return <Edit className="w-3.5 h-3.5 text-[#1e40af]" />;
      case 'viewer':
        return <Eye className="w-3.5 h-3.5 text-[#6b7280]" />;
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-[#f3e8ff] text-[#6b21a8] border-[#d8b4fe]';
      case 'editor':
        return 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]';
      case 'viewer':
        return 'bg-[#f3f4f6] text-[#374151] border-[#d1d5db]';
    }
  };

  return (
    <div className="bg-white border border-[#d1d5db] p-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Users className="w-4 h-4 text-[#6b7280]" />
          <h3 className="text-xs font-semibold text-[#1a1a1a]">Collaborators</h3>
        </div>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#2563eb] hover:bg-[#eff6ff] transition-colors flex-shrink-0 whitespace-nowrap border border-transparent hover:border-[#bfdbfe]"
          >
            <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {showAddUser && currentUser.role === 'admin' && (
        <div className="mb-2 p-3 bg-[#f9fafb] border border-[#d1d5db]">
          <input
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-2 py-1.5 border border-[#d1d5db] text-xs mb-2 focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as User['role'])}
            className="w-full px-2 py-1.5 border border-[#d1d5db] text-xs mb-2 focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
            disabled
          >
            <option value="viewer">Viewer</option>
          </select>
          <p className="text-xs text-[#6b7280] mb-2">All collaborators are viewers for now</p>
          <div className="flex gap-1.5">
            <button
              onClick={handleAddUser}
              className="px-3 py-1 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddUser(false);
                setNewUserEmail('');
              }}
              className="px-3 py-1 bg-[#f3f4f6] text-[#374151] text-xs font-medium hover:bg-[#e5e7eb] transition-colors border border-[#d1d5db]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {users.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#6b7280]">
            No collaborators yet. Add someone to share this proposal.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 bg-[#f9fafb] border border-[#d1d5db] gap-2 min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 bg-[#1a1a1a] flex items-center justify-center text-white text-xs font-medium flex-shrink-0 border border-[#d1d5db]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#1a1a1a] truncate">{user.name}</p>
                  <p className="text-xs text-[#6b7280] truncate mono">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="flex-shrink-0">{getRoleIcon(user.role)}</span>
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium whitespace-nowrap border ${getRoleColor(user.role)}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
