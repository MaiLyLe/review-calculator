import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styles from './Overlay.module.css';
import { Button } from './Button';

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Overlay: React.FC<OverlayProps> = ({ isOpen, onClose, children }) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <div className={styles.closeButton}>
            <Dialog.Close asChild>
              <Button size="sm">
                Schließen
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
