import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AppWorker {
  isSliderOpen: boolean = false;
  toggleSlider() {
    this.isSliderOpen = !this.isSliderOpen;
  }
}
