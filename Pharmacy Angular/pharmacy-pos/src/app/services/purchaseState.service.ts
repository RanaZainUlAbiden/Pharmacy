import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PurchaseStateService {

  private STORAGE_KEY = 'purchase_form_state';

  saveState(data: any) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  getState(): any {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  clearState() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}