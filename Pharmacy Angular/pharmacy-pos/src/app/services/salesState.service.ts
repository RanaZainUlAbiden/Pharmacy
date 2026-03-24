import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SalesStateService {

  cart: any[] = [];
  customerName = '';
  discountPercent = 0;
  paidAmount = 0;

}