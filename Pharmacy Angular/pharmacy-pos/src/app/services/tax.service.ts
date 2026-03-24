import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaxService {

  private taxRateSubject = new BehaviorSubject<number>(17); // default
  taxRate$ = this.taxRateSubject.asObservable();

  constructor() {
    this.loadInitialTax();
  }

  private loadInitialTax() {
    const saved = localStorage.getItem('companySettings');
    if (saved) {
      const data = JSON.parse(saved);
      this.taxRateSubject.next(data.taxRate || 0);
    }
  }

  setTaxRate(rate: number) {
    this.taxRateSubject.next(rate);
  }

  getTaxRate(): number {
    return this.taxRateSubject.value;
  }
}