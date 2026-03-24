import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent implements OnInit {
  currentUser: any;
  currentDate: Date = new Date();
  sidebarCollapsed = false;
  
  // Menu items
  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', active: false },
    { icon: 'point_of_sale', label: 'Sales', route: '/sales', active: false },
    { icon: 'medication', label: 'Medicines', route: '/medicines', active: false },
    { icon: 'inventory', label: 'Stock', route: '/stock', active: false },
    { icon: 'people', label: 'companies', route: '/companies', active: false },
    { icon: 'shopping_cart', label: 'Purchases', route: '/purchases', active: false },
    { icon: 'reorder', label: 'Reorder', route: '/reorder', active: false },
    { icon: 'assessment', label: 'Reports', route: '/reports', active: false },
    { icon: 'settings', label: 'Settings', route: '/settings', active: false }
  ];

  constructor(
    private router: Router,
    private db: DatabaseService
  ) {
    const user = localStorage.getItem('currentUser');
    if (user) {
      this.currentUser = JSON.parse(user);
    } else {
      this.router.navigate(['/login']);
    }

    const savedState = localStorage.getItem('sidebarCollapsed');
    this.sidebarCollapsed = savedState === 'true';
  }

  ngOnInit() {
    // Set active menu based on current route
    this.updateActiveMenu();
    
    // Listen for route changes to update active menu
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveMenu();
      });
  }

  updateActiveMenu() {
    const currentRoute = this.router.url;
    this.menuItems.forEach(item => {
      // Check if current URL starts with the menu route
      item.active = currentRoute.startsWith(item.route);
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  navigateTo(route: string) {
    // Update active menu immediately
    this.menuItems.forEach(item => {
      item.active = item.route === route;
    });
    
    // Navigate
    this.router.navigate([route]);
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  getPageTitle(): string {
    const currentRoute = this.router.url;
    
    if (currentRoute.includes('/dashboard')) return 'Dashboard';
    if (currentRoute.includes('/customers')) return 'Customers';
    if (currentRoute.includes('/sales')) return 'Sales';
    if (currentRoute.includes('/medicines')) return 'Medicines';
    if (currentRoute.includes('/stock')) return 'Stock Management';
    if (currentRoute.includes('/purchases')) return 'Purchases';
    if (currentRoute.includes('/reports')) return 'Reports';
    if (currentRoute.includes('/settings')) return 'Settings';
    
    return 'Dashboard';
  }
}