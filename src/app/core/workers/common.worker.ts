import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommonWorker {
  constructor() {}

  sidebarHamburger: boolean = false;
  toggleSidebarHamburger() {
    this.sidebarHamburger = !this.sidebarHamburger;
  }
}
