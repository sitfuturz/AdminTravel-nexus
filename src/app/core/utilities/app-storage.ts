import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})

export class AppStorage {
  public set = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public get = (key: string) => {
    let values = localStorage.getItem(key);
    return values != null ? JSON.parse(values) : null;
  }

  public clearKey = (key: string) => localStorage.removeItem(key);
  public clearAll = () => localStorage.clear();
}
