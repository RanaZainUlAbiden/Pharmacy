import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { LayoutComponent } from './components/layout/layout';
import { DashboardComponent } from './components/dashboard/dashboard';
import { CustomersComponent } from './components/customers/customers';
import { CustomersResolver } from './resolvers/customers.resolver';
import { MedicinesComponent} from './components/medicines/medicines'
import { CompaniesComponent} from './components/companies/companies'
import { DashboardResolver } from './resolvers/dashboard.resolver'; // Add this
import { PurchasesComponent } from './components/purchases/purchases';
import { SalesComponent } from './components/sales/sales';
import { StockComponent } from './components/stock/stock';
import { ReportsComponent } from './components/reports/reports';
import { SettingsComponent } from './components/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { 
        path: 'dashboard', 
        component: DashboardComponent,
        resolve: { 
          dashboardData: DashboardResolver  // Add resolver
        }
      },
      { path: 'stock', component: StockComponent }
,
      { path: 'sales', component: SalesComponent }
,{ path: 'reports', component: ReportsComponent },
{ path: 'settings', component: SettingsComponent },
      { 
  path: 'purchases', 
  component: PurchasesComponent
},
      { 
        path: 'customers', 
        component: CustomersComponent,
        resolve: { 
          customerData: CustomersResolver
        }
      },
      {
        path:'medicines',
        component: MedicinesComponent
      },
      {
        path:'companies',
        component: CompaniesComponent
      }

    ]
  }
];