import { useNotifications } from '../../providers/NotificationProvider';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from "../ui/scroll-area"; 

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'completed') return <CheckCircle2 className="text-green-500 mt-1" />;
  if (status === 'failed') return <XCircle className="text-red-500 mt-1" />;
  return <Clock className="text-blue-500 mt-1 animate-spin" />;
};

export const NotificationPanel = () => {
  const { notifications } = useNotifications();

  return (
    <div>
      <div className="p-3 border-b">
        <h3 className="font-semibold text-slate-800">Notifications</h3>
      </div>
      <ScrollArea className="h-96">
        <div className="p-2">
          {notifications.length === 0 ? (
            <p className="text-slate-500 text-sm text-center p-4">
              Aucune notification pour le moment.
            </p>
          ) : (
            notifications.map(n => (
              <div key={n._id} className="flex items-start gap-3 p-3 rounded-md hover:bg-slate-50">
                <StatusIcon status={n.status} />
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{n.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};