'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';

export default function InvestorPortalPage() {
  const { currentCompany } = useAppStore();
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (currentCompany) {
      loadInvestors();
    }
  }, [currentCompany]);

  const loadInvestors = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(`/companies/${currentCompany.id}/investors`);
      setInvestors(response.data.investors || []);
    } catch (error) {
      console.error('Failed to load investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email: string, accessLevel: string) => {
    if (!currentCompany) return;

    try {
      await api.post(`/companies/${currentCompany.id}/investors/invite`, {
        email,
        accessLevel,
      });
      loadInvestors();
      setShowInviteModal(false);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Investor invited successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Invite Failed',
        message: error.response?.data?.error?.message || 'Failed to invite investor',
        type: 'error',
      });
    }
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        title="No company selected"
        description="Select a company from the sidebar to manage investors"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Investor Portal</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — Manage investor access and updates
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowInviteModal(true)}>
          + Invite Investor
        </Button>
      </div>

      {investors.length === 0 ? (
        <EmptyState
          icon="💼"
          title="No investors yet"
          description="Invite investors to share updates"
          action={
            <Button variant="primary" onClick={() => setShowInviteModal(true)}>
              Invite Investor
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Investors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {investors.map((investor) => (
                <div
                  key={investor.id}
                  className="flex justify-between items-center p-4 bg-white/5 rounded-lg"
                >
                  <div>
                    <div className="font-semibold">{investor.email}</div>
                    <div className="text-sm text-white/60 [.light_&]:text-slate-600">
                      {investor.accessLevel} • {investor.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm">
                      Send Update
                    </Button>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showInviteModal && (
        <InviteInvestorModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
        />
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

function InviteInvestorModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (email: string, accessLevel: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('read_only');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(email, accessLevel);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Invite Investor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Access Level</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
              }}
            >
              <option value="read_only" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Read Only</option>
              <option value="metrics_only" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Metrics Only</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


