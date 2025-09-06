
import { AppWorker } from './../../../core/workers/app.worker';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SideBarService } from './side-bar.service';
import { CommonModule } from '@angular/common';
import { AppStorage } from 'src/app/core/utilities/app-storage';
import { swalHelper } from 'src/app/core/constants/swal-helper';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
})
export class SideBarComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    private router: Router,
    private storage: AppStorage,
    public authService: AuthService,
    public sideBarService: SideBarService,

    public appWorker: AppWorker,
  ) {}

  isSidebarOpen = false;
  isMobile = false;
  activeSubMenuIndex: number | null = null;

  // Icon mapping from Feather to Font Awesome
  private iconMap: { [key: string]: string } = {
    'home': 'fas fa-home',
    'user-plus': 'fas fa-user-plus',
    'users': 'fas fa-users',
    'file-text': 'fas fa-file-text',
    'calendar-check': 'fas fa-calendar-check',
    'file-import': 'fas fa-file-import',
    'globe': 'fas fa-globe',
    'map': 'fas fa-map',
    'map-pin': 'fas fa-map-marker-alt',
    'layers': 'fas fa-layer-group',
    'tag': 'fas fa-tag',
    'list': 'fas fa-list',
    'banner': 'fas fa-flag',
    'award': 'fas fa-award',
    'clipboard-list': 'fas fa-clipboard-list',
    'lock': 'fas fa-lock',
    'calendar': 'fas fa-calendar',
    'check-circle': 'fas fa-check-circle',
    'check-square': 'fas fa-check-square',
    'corner-up-right': 'fas fa-external-link-alt',
    'corner-down-left': 'fas fa-reply',
    'message-square': 'fas fa-comment',
    'user-check': 'fas fa-user-check',
    'trending-up': 'fas fa-chart-line',
    'user': 'fas fa-user',
    'question-circle': 'fas fa-question-circle',
    'history': 'fas fa-history',
    'clipboard': 'fas fa-clipboard',
    'credit-card': 'fas fa-credit-card',
    'cog': 'fas fa-cog',
    'log-out': 'fas fa-sign-out-alt',
    'key': 'fas fa-key',
    'settings': 'fas fa-cogs',
    'layout': 'fas fa-th-large',
    'bar-chart': 'fas fa-chart-bar',
    'podcast': 'fas fa-podcast',
    'chevron-down': 'fas fa-chevron-down',
    'chevron-right': 'fas fa-chevron-right',
    'user-cog': 'fas fa-user-cog'
  };

  ngOnInit() {
    this.checkScreenSize();
    console.log('Sidebar initialized - isMobile:', this.isMobile, 'isSidebarOpen:', this.isSidebarOpen);
  }

  ngAfterViewInit() {
    // Double-check after view initialization
    setTimeout(() => {
      this.checkScreenSize();
      console.log('After view init - isMobile:', this.isMobile);
    }, 100);
  }

  ngOnDestroy() {
    // Clean up any listeners if needed
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  // Enhanced to handle different breakpoints with debugging
  checkScreenSize() {
    const width = window.innerWidth;
    const previousMobile = this.isMobile;
    this.isMobile = width < 992;
    
    console.log('Screen width:', width, 'isMobile:', this.isMobile);
    
    // Auto-close sidebar when switching to desktop
    if (!this.isMobile && this.isSidebarOpen) {
      this.isSidebarOpen = false;
      console.log('Auto-closing sidebar for desktop');
    }
    
    // Log state changes
    if (previousMobile !== this.isMobile) {
      console.log('Mobile state changed from', previousMobile, 'to', this.isMobile);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    console.log('Sidebar toggled - isSidebarOpen:', this.isSidebarOpen, 'isMobile:', this.isMobile);
    
    // Force detection if needed
    if (this.isMobile && this.isSidebarOpen) {
      // Add a small delay to ensure DOM updates
      setTimeout(() => {
        const sidebar = document.getElementById('sidebar');
        console.log('Sidebar element:', sidebar, 'Classes:', sidebar?.className);
      }, 50);
    }
  }

  closeSidebar() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
      console.log('Sidebar closed on mobile');
    }
  }

  // Method to get Font Awesome class for given icon name
  getIconClass(iconName: string): string {
    return this.iconMap[iconName] || 'fas fa-circle';
  }

  // Enhanced submenu handling
  toggleSubMenu(index: number) {
    if (this.activeSubMenuIndex === index) {
      this.activeSubMenuIndex = null;
    } else {
      this.activeSubMenuIndex = index;
    }
    console.log('Submenu toggled - activeIndex:', this.activeSubMenuIndex);
  }

  // Check if submenu is active
  isSubMenuActive(index: number): boolean {
    return this.activeSubMenuIndex === index;
  }

  // Enhanced navigation with automatic sidebar closing
  navigateToRoute(link: string, queryParams?: any) {
    console.log('Navigating to:', link, 'with params:', queryParams);
    this.router.navigate([link], { queryParams: queryParams || {} });
    this.closeSidebar();
  }

  // Check if any submenu item is active
  isParentMenuActive(submenu: any[]): boolean {
    return submenu.some(item => this.router.url.includes(item.link));
  }

  logout = async () => {
    let confirm = await swalHelper.confirmation(
      'Logout',
      'Do you really want to logout',
      'question'
    );
    if (confirm.isConfirmed) {
      this.storage.clearAll();
      this.router.navigate(['/adminLogin']);
    }
  };
}
