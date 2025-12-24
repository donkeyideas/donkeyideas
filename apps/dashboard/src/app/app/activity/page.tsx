'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { Button } from '@donkey-ideas/ui';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function ActivityPage() {
  const { currentCompany } = useAppStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompany) {
      setLoading(false);
      return;
    }

    const loadActivities = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/companies/${currentCompany.id}/activities`);
        setActivities(response.data.activities || []);
      } catch (error) {
        console.error('Failed to load activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [currentCompany]);

  if (!currentCompany) {
    return (
      <div>
        <EmptyState
          icon="📝"
          title="No company selected"
          description="Select a company to view activity logs"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Activity Logs</h1>
        <div className="text-white/60">Loading activities...</div>
      </div>
    );
  }

  const formatAction = (action: string, entityType: string) => {
    const actionMap: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      move: 'Moved',
    };
    const entityMap: Record<string, string> = {
      card: 'card',
      column: 'column',
      board: 'board',
    };
    const formattedAction = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
    const formattedEntity = entityMap[entityType] || entityType;
    return `${formattedAction} ${formattedEntity}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChanges = (changes: any, action: string, entityType: string): JSX.Element | null => {
    if (!changes) return null;

    // Handle move action
    if (action === 'move' && entityType === 'card') {
      const title = changes.title || 'Card';
      return (
        <div className="ml-5 text-sm text-white/60">
          Moved <span className="font-semibold text-white">{title}</span> to a different column
        </div>
      );
    }

    // Handle update action
    if (action === 'update') {
      const items: JSX.Element[] = [];
      
      if (changes.before && changes.after) {
        // Card/Column updates
        if (changes.before.title !== changes.after.title) {
          items.push(
            <div key="title">
              Title: <span className="line-through text-red-400">{changes.before.title}</span>{' '}
              → <span className="text-green-400">{changes.after.title}</span>
            </div>
          );
        }
        if (changes.before.description !== changes.after.description) {
          const beforeDesc = changes.before.description || '(empty)';
          const afterDesc = changes.after.description || '(empty)';
          const truncate = (text: string, max: number) => {
            if (text.length <= max) return text;
            return text.substring(0, max) + '...';
          };
          items.push(
            <div key="description" className="space-y-1">
              <div>Description changed:</div>
              <div className="ml-4">
                <div className="line-through text-red-400 text-xs">{truncate(beforeDesc, 100)}</div>
                <div className="text-green-400 text-xs">{truncate(afterDesc, 100)}</div>
              </div>
            </div>
          );
        }
        if (changes.before.name !== changes.after.name) {
          items.push(
            <div key="name">
              Name: <span className="line-through text-red-400">{changes.before.name}</span>{' '}
              → <span className="text-green-400">{changes.after.name}</span>
            </div>
          );
        }
      }
      
      if (items.length > 0) {
        return (
          <div className="ml-5 text-sm text-white/60 space-y-1">
            {items}
          </div>
        );
      }
    }

    // Handle create action
    if (action === 'create') {
      if (changes.title) {
        return (
          <div className="ml-5 text-sm text-white/60">
            Created <span className="font-semibold text-white">{changes.title}</span>
          </div>
        );
      }
      if (changes.name) {
        return (
          <div className="ml-5 text-sm text-white/60">
            Created <span className="font-semibold text-white">{changes.name}</span>
          </div>
        );
      }
    }

    // Handle delete action
    if (action === 'delete') {
      if (changes.title) {
        return (
          <div className="ml-5 text-sm text-white/60">
            Deleted <span className="font-semibold text-white">{changes.title}</span>
          </div>
        );
      }
      if (changes.name) {
        return (
          <div className="ml-5 text-sm text-white/60">
            Deleted <span className="font-semibold text-white">{changes.name}</span>
          </div>
        );
      }
    }

    // Fallback to formatted JSON
    return (
      <div className="ml-5 text-sm text-white/60 font-mono">
        {JSON.stringify(changes, null, 2)}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
        <p className="text-white/60">
          {currentCompany.name} — Complete audit trail of all changes
        </p>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No activity yet"
          description="Activity logs will appear here as you make changes to your company data"
        />
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="font-semibold">
                        {formatAction(activity.action, activity.entityType)}
                      </span>
                      <span className="text-white/40 text-sm">
                        by {activity.user.name}
                      </span>
                    </div>
                    {formatChanges(activity.changes, activity.action, activity.entityType)}
                  </div>
                  <div className="text-sm text-white/40">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


