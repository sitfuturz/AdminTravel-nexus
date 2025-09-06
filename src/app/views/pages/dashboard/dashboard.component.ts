// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { DashboardService, DashboardCounts, DashboardResponse, CityService, City, CityResponse } from '../../../services/auth.service';
// import { swalHelper } from '../../../core/constants/swal-helper';

// interface Chapter {
//   _id: string;
//   name: string;
//   city_name: string;
//   status: boolean;
//   createdAt: string;
//   __v: number;
// }

// @Component({
//   selector: 'app-dashboard',
//   templateUrl: './dashboard.component.html',
//   styleUrls: ['./dashboard.component.css'],
//   standalone: true,
//   imports: [CommonModule, FormsModule],
// })
// export class DashboardComponent implements OnInit {
//   loading = false;
//   showAdvancedFilters = false;
  
//   counts: DashboardCounts = {
//     users: 0,
//     admins: 0,
//     asks: 0,
//     referrals: { given: 0, received: 0, total: 0 },
//     tyfcbs: { given: 0, received: 0, total: 0 },
//     oneToOnes: { initiated: 0, participated: 0, total: 0 },
//     testimonials: { given: 0, received: 0, total: 0 },
//     testimonialReqs: 0,
//     banners: 0,
//     events: 0,
//   };

//   // Filter variables
//   cities: City[] = [];
//   chapters: Chapter[] = [];
//   selectedCity: string = '';
//   selectedChapter: string = '';
//   fromDate: string = '';
//   toDate: string = '';

//   constructor(
//     private dashboardService: DashboardService,
//     private cityService: CityService
//   ) {}

//   ngOnInit(): void {
//     this.loadCities();
//     this.loadDashboardCounts();
//   }

//   async loadCities(): Promise<void> {
//     try {
//       const response: CityResponse = await this.cityService.getAllCities({
//         page: 1,
//         limit: 100,
//         search: '',
//       });
//       this.cities = response.docs || [];
//     } catch (error) {
//       console.error('Failed to load cities:', error);
//     }
//   }

//   async onCityChange(): Promise<void> {
//     this.selectedChapter = '';
//     this.chapters = [];
//     if (this.selectedCity) {
//       try {
//         const response = await this.dashboardService.getChaptersByCity(this.selectedCity);
//         this.chapters = response.data || [];
//       } catch (error) {
//         console.error('Failed to load chapters:', error);
//       }
//     }
//     // Auto-apply filters when city changes
//     this.loadDashboardCounts();
//   }

//   async loadDashboardCounts(): Promise<void> {
//     this.loading = true;
//     try {
//       const filters: any = {};
//       if (this.selectedCity) filters.city = this.selectedCity;
//       if (this.selectedChapter) filters.chapter = this.selectedChapter;
//       if (this.fromDate) filters.fromDate = this.fromDate;
//       if (this.toDate) filters.toDate = this.toDate;

//       const response: DashboardResponse = await this.dashboardService.getDashboardCounts(filters);
//       if (response && response.data) {
//         this.counts = response.data;
//         console.log('Dashboard counts updated:', this.counts);
//       } else {
//         swalHelper.showToast('Invalid data format received', 'error');
//       }
//     } catch (error) {
//       console.error('Failed to load dashboard counts:', error);
//       swalHelper.showToast('Failed to load dashboard data', 'error');
//     } finally {
//       this.loading = false;
//     }
//   }

//   toggleAdvancedFilters(): void {
//     this.showAdvancedFilters = !this.showAdvancedFilters;
//   }

//   applyFilters(): void {
//     this.loadDashboardCounts();
//     // Show success toast
//     swalHelper.showToast('Filters applied successfully', 'success');
//   }

//   resetFilters(): void {
//     this.selectedCity = '';
//     this.selectedChapter = '';
//     this.fromDate = '';
//     this.toDate = '';
//     this.chapters = [];
//     this.loadDashboardCounts();
//     swalHelper.showToast('Filters reset successfully', 'info');
//   }

//   hasActiveFilters(): boolean {
//     return !!(this.selectedCity || this.selectedChapter || this.fromDate || this.toDate);
//   }

//   // Individual filter clearing methods
//   clearCityFilter(): void {
//     this.selectedCity = '';
//     this.selectedChapter = '';
//     this.chapters = [];
//     this.loadDashboardCounts();
//   }

//   clearChapterFilter(): void {
//     this.selectedChapter = '';
//     this.loadDashboardCounts();
//   }

//   clearFromDate(): void {
//     this.fromDate = '';
//     this.loadDashboardCounts();
//   }

//   clearToDate(): void {
//     this.toDate = '';
//     this.loadDashboardCounts();
//   }
// }


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, DashboardCounts, DashboardResponse, ChapterService, Chapter  } from '../../../services/auth.service';
// Import ChapterService
import { swalHelper } from '../../../core/constants/swal-helper';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class DashboardComponent implements OnInit {
  loading = false;
  showAdvancedFilters = false;

  counts: DashboardCounts = {
    users: 0,
    admins: 0,
    asks: 0,
    referrals: { given: 0, received: 0, total: 0 },
    tyfcbs: { given: 0, received: 0, total: 0 },
    oneToOnes: { initiated: 0, participated: 0, total: 0 },
    testimonials: { given: 0, received: 0, total: 0 },
    testimonialReqs: 0,
    banners: 0,
    events: 0,
  };

  // Filter variables
  chapters: Chapter[] = [];
  selectedChapter: string = '';
  fromDate: string = '';
  toDate: string = '';

  constructor(
    private dashboardService: DashboardService,
    private chapterService: ChapterService // Replace CityService with ChapterService
  ) {}

  ngOnInit(): void {
    this.loadChapters(); // Load chapters directly
    this.loadDashboardCounts();
  }

  async loadChapters(): Promise<void> {
    try {
      this.chapters = await this.chapterService.getAllChaptersForDropdown();
    } catch (error) {
      console.error('Failed to load chapters:', error);
      swalHelper.showToast('Failed to load chapters', 'error');
    }
  }

  async loadDashboardCounts(): Promise<void> {
    this.loading = true;
    try {
      const filters: any = {};
      if (this.selectedChapter) filters.chapter = this.selectedChapter;
      if (this.fromDate) filters.fromDate = this.fromDate;
      if (this.toDate) filters.toDate = this.toDate;

      const response: DashboardResponse = await this.dashboardService.getDashboardCounts(filters);
      if (response && response.data) {
        this.counts = response.data;
        console.log('Dashboard counts updated:', this.counts);
      } else {
        swalHelper.showToast('Invalid data format received', 'error');
      }
    } catch (error) {
      console.error('Failed to load dashboard counts:', error);
      swalHelper.showToast('Failed to load dashboard data', 'error');
    } finally {
      this.loading = false;
    }
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  applyFilters(): void {
    this.loadDashboardCounts();
    swalHelper.showToast('Filters applied successfully', 'success');
  }

  resetFilters(): void {
    this.selectedChapter = '';
    this.fromDate = '';
    this.toDate = '';
    this.loadDashboardCounts();
    swalHelper.showToast('Filters reset successfully', 'info');
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedChapter || this.fromDate || this.toDate);
  }

  clearChapterFilter(): void {
    this.selectedChapter = '';
    this.loadDashboardCounts();
  }

  clearFromDate(): void {
    this.fromDate = '';
    this.loadDashboardCounts();
  }

  clearToDate(): void {
    this.toDate = '';
    this.loadDashboardCounts();
  }
}