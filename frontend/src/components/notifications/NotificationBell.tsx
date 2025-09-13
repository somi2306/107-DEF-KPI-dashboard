import { Bell } from 'lucide-react';
import { useNotifications } from '../../providers/NotificationProvider';

import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { NotificationPanel } from './NotificationPanel';

export const NotificationBell = () => {
  const { unreadCount, markAsRead } = useNotifications();

  const handleOpenChange = (isOpen: boolean) => {
    // Marquer comme lu uniquement à l'ouverture du panneau
    if (isOpen && unreadCount > 0) {
      markAsRead();
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">
                {unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <NotificationPanel />
      </PopoverContent>
    </Popover>
  );
};