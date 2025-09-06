import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ChapterService, Chapter, ChapterResponse } from '../../../services/auth.service';
import { CityService, City } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-chapters',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [ChapterService, CityService],
  templateUrl: './chapter.component.html',
  styleUrls: ['./chapter.component.css'],
})
export class ChaptersComponent implements OnInit, AfterViewInit {
  chapters: ChapterResponse = {
    docs: [],
    data: undefined,
    message: '',
    success: true,
    status: 200,
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };

  cities: City[] = [];
  loading: boolean = false;
  citiesLoading: boolean = false;
  searchQuery: string = '';
  selectedChapter: Chapter | null = null;
  chapterModal: any;
  editMode: boolean = false;
  citiesLoaded: boolean = false;

  newChapter = {
    name: '',
    city_id: '',
    city_name: '',
    registration_fee: 0,
    renewal_fee: 0,
    membership_duration_days: 365,
    status: false,
  };

  private searchSubject = new Subject<string>();

  payload = {
    search: '',
    page: 1,
    limit: 10,
  };

  constructor(
    private chapterService: ChapterService,
    private cityService: CityService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchChapters();
    });
  }

  ngOnInit(): void {
    this.fetchCities();
    this.fetchChapters();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('chapterModal');
      if (modalElement) {
        this.chapterModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchChapters(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search,
      };
      const response = await this.chapterService.getAllChapters(requestData);
      this.chapters = response;
      console.log('Fetched chapters:', this.chapters);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    } finally {
      this.loading = false;
    }
  }

  async fetchCities(): Promise<void> {
    this.citiesLoading = true;
    this.citiesLoaded = false;
    try {
      const response = await this.cityService.getAllCities({
        page: 1,
        limit: 1000,
        search: '',
      });
      this.cities = response.docs;
      this.citiesLoaded = true;
      console.log('Fetched cities:', this.cities);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching cities:', error);
      swalHelper.showToast('Failed to fetch cities', 'error');
    } finally {
      this.citiesLoading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchChapters();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchChapters();
  }

  openAddChapterModal(): void {
    if (!this.citiesLoaded) {
      swalHelper.showToast('Please wait for cities to load', 'warning');
      return;
    }
    this.editMode = false;
    this.newChapter = {
      name: '',
      city_id: '',
      city_name: '',
      registration_fee: 0,
      renewal_fee: 0,
      membership_duration_days: 365,
      status: false,
    };
    this.showModal();
  }

  openEditChapterModal(chapter: Chapter): void {
    if (!this.citiesLoaded) {
      swalHelper.showToast('Please wait for cities to load', 'warning');
      return;
    }
    this.editMode = true;
    this.selectedChapter = chapter;
    console.log('Full chapter object:', JSON.stringify(chapter, null, 2));
    const cityId = this.getCityIdByName(chapter.city_name) || chapter.city_id || '';
    this.newChapter = {
      name: chapter.name,
      city_id: cityId,
      city_name: chapter.city_name || '',
      registration_fee: chapter.fees?.registration_fee || 0,
      renewal_fee: chapter.fees?.renewal_fee || 0,
      membership_duration_days: chapter.fees?.membership_duration_days || 365,
      status: chapter.status,
    };
    console.log('newChapter after initialization:', this.newChapter);
    console.log('Cities available:', this.cities);
    this.cdr.detectChanges();
    setTimeout(() => this.showModal(), 100);
  }

  private getCityIdByName(cityName: string | undefined): string | undefined {
    if (!cityName) {
      console.log('No city_name provided');
      return undefined;
    }
    const city = this.cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    console.log(`Looking up city_id for city_name: ${cityName}, found:`, city);
    return city ? city._id : undefined;
  }

  showModal(): void {
    this.cdr.detectChanges();
    if (this.chapterModal) {
      this.chapterModal.show();
    } else {
      try {
        const modalElement = document.getElementById('chapterModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.chapterModal = modalInstance;
          modalInstance.show();
        } else {
          $('#chapterModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#chapterModal').modal('show');
      }
    }
  }

  closeModal(): void {
    if (this.chapterModal) {
      this.chapterModal.hide();
    } else {
      $('#chapterModal').modal('hide');
    }
  }

  async saveChapter(): Promise<void> {
    try {
      this.loading = true;
      // Set city_name based on selected city_id
      const selectedCity = this.cities.find(c => c._id === this.newChapter.city_id);
      this.newChapter.city_name = selectedCity ? selectedCity.name : '';

      const payload = {
        name: this.newChapter.name,
        city_name: this.newChapter.city_name,
        status: this.newChapter.status,
        fees: {
          registration_fee: this.newChapter.registration_fee,
          renewal_fee: this.newChapter.renewal_fee,
          membership_duration_days: this.newChapter.membership_duration_days,
        },
      };

      if (this.editMode && this.selectedChapter) {
        const response = await this.chapterService.updateChapter(this.selectedChapter._id, payload);
        console.log('Update response:', JSON.stringify(response, null, 2));
        if (response.success && (response.status === 200 || response.status === 201)) {
          swalHelper.showToast(response.message || 'Chapter updated successfully', 'success');
          this.closeModal();
          this.fetchChapters();
        } else {
          swalHelper.showToast(response.message || 'Failed to update chapter', 'error');
        }
      } else {
        const response = await this.chapterService.createChapter(payload);
        console.log('Create response:', JSON.stringify(response, null, 2));
        if (response.success && (response.status === 201 || response.status === 200)) {
          swalHelper.showToast(response.message || 'Chapter created successfully', 'success');
          this.closeModal();
          this.fetchChapters();
        } else {
          swalHelper.showToast(response.message || 'Failed to create chapter', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      swalHelper.showToast('Failed to save chapter', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleChapterStatus(chapter: Chapter): Promise<void> {
    try {
      this.loading = true;
      const updatedStatus = !chapter.status;
      const cityId = this.getCityIdByName(chapter.city_name) || chapter.city_id;
      const city = this.cities.find(c => c._id === cityId);
      const response = await this.chapterService.updateChapter(chapter._id, {
        name: chapter.name,
        city_name: city ? city.name : chapter.city_name || '',
        status: updatedStatus,
        fees: {
          registration_fee: chapter.fees?.registration_fee || 0,
          renewal_fee: chapter.fees?.renewal_fee || 0,
          membership_duration_days: chapter.fees?.membership_duration_days || 365,
        },
      });
      if (response.success && (response.status === 200 || response.status === 201)) {
        chapter.status = updatedStatus;
        swalHelper.showToast(`Chapter status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
        this.fetchChapters();
      } else {
        swalHelper.showToast(response.message || 'Failed to update chapter status', 'error');
      }
    } catch (error) {
      console.error('Error updating chapter status:', error);
      swalHelper.showToast('Failed to update chapter status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteChapter(chapterId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Chapter',
        'Are you sure you want to delete this chapter? This action cannot be undone.',
        'warning'
      );
      if (result.isConfirmed) {
        this.loading = true;
        try {
          const response = await this.chapterService.deleteChapter(chapterId);
          if (response && response.success) {
            swalHelper.showToast(response.message || 'Chapter deleted successfully', 'success');
            this.fetchChapters();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete chapter', 'error');
          }
        } catch (error) {
          console.error('Error deleting chapter:', error);
          swalHelper.showToast('Failed to delete chapter', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  getCityName(cityId: string): string {
    if (!cityId) return 'Not Assigned';
    const city = this.cities.find(c => c._id === cityId);
    return city ? city.name : 'Not Assigned';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}