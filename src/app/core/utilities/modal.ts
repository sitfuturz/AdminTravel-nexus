import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalInstances: { [key: string]: any } = {};
  constructor() { }
  open(modalId: string): void {
    modalId = modalId.replace('#', '');
    if (typeof window !== 'undefined' && (window as any).bootstrap) {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        if (!this.modalInstances[modalId]) {
          this.modalInstances[modalId] = new (window as any).bootstrap.Modal(
            modalElement
          );
        }
        this.modalInstances[modalId].show();
      } else {
        console.error(`Modal with id ${modalId} not found`);
      }
    } else {
      console.error('Bootstrap is not available');
    }
  }
  close(modalId: string): void {
    modalId = modalId.replace('#', '');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (this.modalInstances[modalId]) {
      this.modalInstances[modalId].hide();
      setTimeout(() => {
        delete this.modalInstances[modalId];
      }, 500);
    }
  }
}
