import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/env/env.local';
import { PodcastService, Podcast, PodcastResponse, Slot, SlotResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { BsDatepickerModule, BsDaterangepickerDirective } from 'ngx-bootstrap/datepicker';

declare var bootstrap: any;
declare var $: any;

@Component({
  selector: 'app-podcasts',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule, BsDatepickerModule],
  providers: [PodcastService],
  templateUrl: './podcast.component.html',
  styleUrls: ['./podcast.component.css'],
})
export class PodcastsComponent implements OnInit, AfterViewInit {
  podcasts: PodcastResponse = { podcasts: [], total: 0, limit: 10, page: 1, totalPages: 1 };
  loading: boolean = false;
  searchQuery: string = '';
  selectedPodcast: Podcast | null = null;
  selectedPodcastForPreview: Podcast | null = null;
  selectedPodcastForSlots: Podcast | null = null;
  podcastModal: any;
  imagePreviewModal: any;
  slotModal: any;
  viewSlotsModal: any;
  editMode: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageurl = environment.imageUrl;
  formSubmitted: boolean = false;
  slotLoading: boolean = false;
  
  // Slots data
  slots: Slot[] = [];
  slotsLoading: boolean = false;
  slotsPagination: any = null;
  selectedSlotIds: string[] = [];
  selectAllSlots: boolean = false;
  slotsPage: number = 1;
  slotsLimit: number = 12;

  Math = Math;

  newPodcast: Podcast = {
    podcasterName: '',
    podcasterImage: '',
    aboutPodcaster: '',
    venue: '',
    startDate: '',
    endDate: '',
    isActive: true,
    status: 'upcoming',
    _id: '',
    createdAt: '',
    updatedAt: '',
    __v: 0
  };

  slotFormData = {
    dates: [] as string[],
    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '18:00',
    duration: 60,
    capacity: 5
  };

  minDate: string = '';
  maxDate: string = '';

  private searchSubject = new Subject<string>();

  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  constructor(
    private podcastService: PodcastService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchPodcasts();
    });
  }

  ngOnInit(): void {
    this.fetchPodcasts();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('podcastModal');
      if (modalElement) {
        this.podcastModal = new bootstrap.Modal(modalElement);
      }

      const imagePreviewModalElement = document.getElementById('imagePreviewModal');
      if (imagePreviewModalElement) {
        this.imagePreviewModal = new bootstrap.Modal(imagePreviewModalElement);
      }

      const slotModalElement = document.getElementById('slotModal'); 
      if (slotModalElement) {
        this.slotModal = new bootstrap.Modal(slotModalElement);
      }

      const viewSlotsModalElement = document.getElementById('viewSlotsModal');
      if (viewSlotsModalElement) {
        this.viewSlotsModal = new bootstrap.Modal(viewSlotsModalElement);
      }
    }, 300);
  }

  async fetchPodcasts(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      const response = await this.podcastService.getPodcasts(requestData);
      this.podcasts = response.data || response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching podcasts:', error);
      swalHelper.showToast('Failed to fetch podcasts', 'error');
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchPodcasts();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchPodcasts();
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        swalHelper.showToast('Please select a valid image file (JPG, PNG)', 'error');
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        swalHelper.showToast('File size should not exceed 5MB', 'error');
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.newPodcast.podcasterImage = this.imagePreview ?? '';
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  openAddPodcastModal(): void {
    this.editMode = false;
    this.resetForm();
    this.showModal();
  }

  openEditPodcastModal(podcast: Podcast): void {
    this.editMode = true;
    this.selectedPodcast = podcast;
    this.newPodcast = { ...podcast, podcasterImage: '' };
    this.imagePreview = podcast.podcasterImage ? this.getImageUrl(podcast.podcasterImage) : null;
    this.formSubmitted = false;
    this.showModal();
  }

  openGenerateSlotModal(podcast: Podcast): void {
    this.selectedPodcastForSlots = podcast;
    this.slotFormData = {
      dates: [],
      startDate: '',
      endDate: '',
      startTime: '10:00',
      endTime: '18:00',
      duration: 60,
      capacity: 5
    };

    if (podcast.startDate && podcast.endDate) {
      this.minDate = this.formatDateForInput(podcast.startDate);
      this.maxDate = this.formatDateForInput(podcast.endDate);
    }

    this.showSlotModal();
  }

  openViewSlotsModal(podcast: Podcast): void {
    this.selectedPodcastForSlots = podcast;
    this.resetSlotsData();
    this.fetchSlots();
    this.showViewSlotsModal();
  }

  openImagePreview(podcast: Podcast): void {
    this.selectedPodcastForPreview = podcast;
    this.showImagePreviewModal();
  }

  resetForm(): void {
    this.newPodcast = {
      podcasterName: '',
      podcasterImage: '',
      aboutPodcaster: '',
      venue: '',
      startDate: '',
      endDate: '',
      isActive: true,
      status: 'upcoming',
      _id: '',
      createdAt: '',
      updatedAt: '',
      __v: 0
    };
    this.selectedFile = null;
    this.imagePreview = null;
    this.formSubmitted = false;
  }

  resetSlotsData(): void {
    this.slots = [];
    this.selectedSlotIds = [];
    this.selectAllSlots = false;
    this.slotsPage = 1;
    this.slotsPagination = null;
  }

  showModal(): void {
    this.formSubmitted = false;
    this.cdr.detectChanges();
    if (this.podcastModal) {
      this.podcastModal.show();
    } else {
      try {
        const modalElement = document.getElementById('podcastModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.podcastModal = modalInstance;
          modalInstance.show();
        } else {
          $('#podcastModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#podcastModal').modal('show');
      }
    }
  }

  showSlotModal(): void {
    this.cdr.detectChanges();
    if (this.slotModal) {
      this.slotModal.show();
    } else {
      try {
        const modalElement = document.getElementById('slotModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.slotModal = modalInstance;
          modalInstance.show();
        } else {
          $('#slotModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing slot modal:', error);
        $('#slotModal').modal('show');
      }
    }
  }

  showViewSlotsModal(): void {
    this.cdr.detectChanges();
    if (this.viewSlotsModal) {
      this.viewSlotsModal.show();
    } else {
      try {
        const modalElement = document.getElementById('viewSlotsModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.viewSlotsModal = modalInstance;
          modalInstance.show();
        } else {
          $('#viewSlotsModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing view slots modal:', error);
        $('#viewSlotsModal').modal('show');
      }
    }
  }

  showImagePreviewModal(): void {
    this.cdr.detectChanges();
    if (this.imagePreviewModal) {
      this.imagePreviewModal.show();
    } else {
      try {
        const modalElement = document.getElementById('imagePreviewModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.imagePreviewModal = modalInstance;
          modalInstance.show();
        } else {
          $('#imagePreviewModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing image preview modal:', error);
        $('#imagePreviewModal').modal('show');
      }
    }
  }

  closeModal(): void {
    if (this.podcastModal) {
      this.podcastModal.hide();
    } else {
      $('#podcastModal').modal('hide');
    }
    this.resetForm();
  }

  closeSlotModal(): void {
    if (this.slotModal) {
      this.slotModal.hide();
    } else {
      $('#slotModal').modal('hide');
    }
  }

  closeViewSlotsModal(): void {
    if (this.viewSlotsModal) {
      this.viewSlotsModal.hide();
    } else {
      $('#viewSlotsModal').modal('hide');
    }
    this.resetSlotsData();
  }

  // Slots management methods
  async fetchSlots(): Promise<void> {
    if (!this.selectedPodcastForSlots) return;

    this.slotsLoading = true;
    try {
      const response = await this.podcastService.getSlotsByPodcastId(
        this.selectedPodcastForSlots._id,
        this.slotsPage,
        this.slotsLimit
      );

      if (response && response.success && response.data) {
        this.slots = response.data.slot.docs || [];
        this.slotsPagination = {
          totalDocs: response.data.slot.totalDocs,
          limit: response.data.slot.limit,
          totalPages: response.data.slot.totalPages,
          page: response.data.slot.page,
          pagingCounter: response.data.slot.pagingCounter,
          hasPrevPage: response.data.slot.hasPrevPage,
          hasNextPage: response.data.slot.hasNextPage,
          prevPage: response.data.slot.prevPage,
          nextPage: response.data.slot.nextPage
        };
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      swalHelper.showToast('Failed to fetch slots', 'error');
    } finally {
      this.slotsLoading = false;
    }
  }

  changeSlotPage(page: number): void {
    if (page >= 1 && page <= (this.slotsPagination?.totalPages || 1)) {
      this.slotsPage = page;
      this.resetSlotsSelection();
      this.fetchSlots();
    }
  }

  resetSlotsSelection(): void {
    this.selectedSlotIds = [];
    this.selectAllSlots = false;
  }

  onSlotSelectionChange(slotId: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedSlotIds.includes(slotId)) {
        this.selectedSlotIds.push(slotId);
      }
    } else {
      this.selectedSlotIds = this.selectedSlotIds.filter(id => id !== slotId);
    }
    
    // Update select all checkbox state
    this.selectAllSlots = this.slots.length > 0 && this.selectedSlotIds.length === this.slots.length;
  }

  toggleSelectAllSlots(): void {
    if (this.selectAllSlots) {
      this.selectedSlotIds = this.slots.map(slot => slot._id);
    } else {
      this.selectedSlotIds = [];
    }
  }

  async deleteSlot(slotId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Slot',
        'Are you sure you want to delete this slot? This action cannot be undone.',
        'warning'
      );

      if (result.isConfirmed) {
        this.slotsLoading = true;
        try {
          const response = await this.podcastService.deleteSlot(slotId);
          if (response && response.success) {
            swalHelper.showToast('Slot deleted successfully', 'success');
            this.fetchSlots();
            // Remove from selection if selected
            this.selectedSlotIds = this.selectedSlotIds.filter(id => id !== slotId);
          } else {
            swalHelper.showToast(response.message || 'Failed to delete slot', 'error');
          }
        } catch (error: any) {
          console.error('Error deleting slot:', error);
          swalHelper.showToast(error?.response?.data?.message || 'Failed to delete slot', 'error');
        } finally {
          this.slotsLoading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  async bulkDeleteSlots(): Promise<void> {
    if (this.selectedSlotIds.length === 0) {
      swalHelper.showToast('Please select slots to delete', 'warning');
      return;
    }

    try {
      const result = await swalHelper.confirmation(
        'Delete Selected Slots',
        `Are you sure you want to delete ${this.selectedSlotIds.length} selected slots? This action cannot be undone.`,
        'warning'
      );

      if (result.isConfirmed) {
        this.slotsLoading = true;
        try {
          const response = await this.podcastService.bulkDeleteSlots(this.selectedSlotIds);
          if (response && response.success) {
            swalHelper.showToast(`${this.selectedSlotIds.length} slots deleted successfully`, 'success');
            this.resetSlotsSelection();
            this.fetchSlots();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete slots', 'error');
          }
        } catch (error: any) {
          console.error('Error bulk deleting slots:', error);
          swalHelper.showToast(error?.response?.data?.message || 'Failed to delete slots', 'error');
        } finally {
          this.slotsLoading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  async deleteAllSlots(): Promise<void> {
    if (!this.slotsPagination?.totalDocs) {
      swalHelper.showToast('No slots to delete', 'info');
      return;
    }

    try {
      const result = await swalHelper.confirmation(
        'Delete All Slots',
        `Are you sure you want to delete ALL ${this.slotsPagination.totalDocs} slots for this podcast? This action cannot be undone.`,
        'warning'
      );

      if (result.isConfirmed) {
        this.slotsLoading = true;
        try {
          // Get all slot IDs from all pages
          const allSlotIds: string[] = [];
          let currentPage = 1;
          const totalPages = this.slotsPagination.totalPages;

          while (currentPage <= totalPages) {
            const response = await this.podcastService.getSlotsByPodcastId(
              this.selectedPodcastForSlots!._id,
              currentPage,
              100 // Get more slots per request
            );
            
            if (response?.success && response.data?.slot?.docs) {
              allSlotIds.push(...response.data.slot.docs.map((slot: Slot) => slot._id));
            }
            currentPage++;
          }

          if (allSlotIds.length > 0) {
            const response = await this.podcastService.bulkDeleteSlots(allSlotIds);
            if (response && response.success) {
              swalHelper.showToast(`All ${allSlotIds.length} slots deleted successfully`, 'success');
              this.resetSlotsSelection();
              this.fetchSlots();
            } else {
              swalHelper.showToast(response.message || 'Failed to delete all slots', 'error');
            }
          }
        } catch (error: any) {
          console.error('Error deleting all slots:', error);
          swalHelper.showToast(error?.response?.data?.message || 'Failed to delete all slots', 'error');
        } finally {
          this.slotsLoading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  // Slot utility methods
  trackBySlotId(index: number, slot: Slot): string {
    return slot._id;
  }

  getSlotStatusText(slot: Slot): string {
    if (slot.isFull) return 'Full';
    if (slot.bookedCount > 0) return `${slot.bookedCount}/${slot.capacity}`;
    return 'Available';
  }

  getBookingPercentage(slot: Slot): number {
    return slot.capacity > 0 ? Math.round((slot.bookedCount / slot.capacity) * 100) : 0;
  }

  formatSlotDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  onDateSelect(event: any): void {
    this.slotFormData.dates = event.map((date: string) => {
      return new Date(date).toISOString().split('T')[0];
    });
  }

  async generateSlots(): Promise<void> {
    if (!this.selectedPodcastForSlots || !this.slotFormData.startDate || !this.slotFormData.endDate) {
      swalHelper.showToast('Please select both start and end dates', 'warning');
      return;
    }

    // Generate all dates between startDate and endDate (inclusive)
    const start = new Date(this.slotFormData.startDate);
    const end = new Date(this.slotFormData.endDate);
    if (start > end) {
      swalHelper.showToast('Start date must be before or equal to end date', 'warning');
      return;
    }
    const dates: string[] = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    if (dates.length === 0) {
      swalHelper.showToast('Please select at least one date', 'warning');
      return;
    }

    if (!this.slotFormData.startTime || !this.slotFormData.endTime) {
      swalHelper.showToast('Please select both start and end times', 'warning');
      return;
    }

    if (this.slotFormData.duration <= 0) {
      swalHelper.showToast('Duration must be greater than 0', 'warning');
      return;
    }

    if (this.slotFormData.capacity <= 0) {
      swalHelper.showToast('Capacity must be greater than 0', 'warning');
      return;
    }

    this.slotLoading = true;
    try {
      const response = await this.podcastService.generateSlots({
        podcastId: this.selectedPodcastForSlots._id,
        dates: dates,
        startTime: this.slotFormData.startTime,
        endTime: this.slotFormData.endTime,
        duration: this.slotFormData.duration,
        capacity: this.slotFormData.capacity
      });

      if (response && response.success) {
        if (response.data.slots.length > 0) {
          swalHelper.showToast(`Successfully generated ${response.data.slots.length} slots`, 'success');
        } else {
          swalHelper.showToast('No new slots were generated (they may already exist)', 'info');
        }
        this.closeSlotModal();
      } else {
        swalHelper.showToast(response.message || 'Failed to generate slots', 'error');
      }
    } catch (error: any) {
      console.error('Error generating slots:', error);
      swalHelper.showToast(error?.error?.message || 'Failed to generate slots', 'error');
    } finally {
      this.slotLoading = false;
    }
  }

  async savePodcast(form: any): Promise<void> {
    this.formSubmitted = true;
    if (form.invalid) {
      swalHelper.showToast('Please fill all required fields correctly', 'warning');
      return;
    }

    try {
      if (!this.newPodcast.podcasterName?.trim()) {
        swalHelper.showToast('Please enter a podcaster name', 'warning');
        return;
      }
      if (!this.editMode && !this.selectedFile) {
        swalHelper.showToast('Please select a podcaster image', 'warning');
        return;
      }
      if (!this.newPodcast.startDate || !this.newPodcast.endDate) {
        swalHelper.showToast('Please select both start and end dates', 'warning');
        return;
      }
      if (new Date(this.newPodcast.startDate) >= new Date(this.newPodcast.endDate)) {
        swalHelper.showToast('Start date must be before end date', 'warning');
        return;
      }

      this.loading = true;
      const formData = new FormData();

      if (this.editMode && this.selectedPodcast) {
        if (this.newPodcast.podcasterName !== this.selectedPodcast.podcasterName) {
          formData.append('podcasterName', this.newPodcast.podcasterName.trim());
        }
        if (this.newPodcast.aboutPodcaster !== this.selectedPodcast.aboutPodcaster) {
          formData.append('aboutPodcaster', this.newPodcast.aboutPodcaster?.trim() || '');
        }
        if (this.newPodcast.venue !== this.selectedPodcast.venue) {
          formData.append('venue', this.newPodcast.venue?.trim() || '');
        }
        if (this.newPodcast.startDate !== this.selectedPodcast.startDate) {
          formData.append('startDate', this.newPodcast.startDate);
        }
        if (this.newPodcast.endDate !== this.selectedPodcast.endDate) {
          formData.append('endDate', this.newPodcast.endDate);
        }
        if (this.newPodcast.isActive !== this.selectedPodcast.isActive) {
          formData.append('isActive', this.newPodcast.isActive.toString());
        }
        if (this.selectedFile) {
          formData.append('image', this.selectedFile);
        }
      } else {
        formData.append('podcasterName', this.newPodcast.podcasterName.trim());
        formData.append('aboutPodcaster', this.newPodcast.aboutPodcaster?.trim() || '');
        formData.append('venue', this.newPodcast.venue?.trim() || '');
        formData.append('startDate', this.newPodcast.startDate);
        formData.append('endDate', this.newPodcast.endDate);
        formData.append('isActive', this.newPodcast.isActive.toString());
        if (this.selectedFile) {
          formData.append('image', this.selectedFile);
        }
      }

      const response = this.editMode && this.selectedPodcast
        ? await this.podcastService.updatePodcast(this.selectedPodcast._id, formData)
        : await this.podcastService.createPodcast(formData);

      if (response && response.success && response.data !== false) {
        swalHelper.showToast(`Podcast ${this.editMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeModal();
        this.fetchPodcasts();
      } else {
        swalHelper.showToast(response.message || `Failed to ${this.editMode ? 'update' : 'create'} podcast`, 'error');
      }
    } catch (error: any) {
      console.error('Error saving podcast:', error);
      swalHelper.showToast(error?.response?.data?.message || error.message || 'Failed to save podcast', 'error');
    } finally {
      this.loading = false;
    }
  }

  async togglePodcastStatus(podcast: Podcast): Promise<void> {
    try {
      this.loading = true;
      const updatedStatus = !podcast.isActive;
      const formData = new FormData();
      formData.append('isActive', updatedStatus.toString());

      const response = await this.podcastService.updatePodcast(podcast._id, formData);

      if (response && response.success && response.data !== false) {
        podcast.isActive = updatedStatus;
        podcast.status = updatedStatus ? 'upcoming' : 'inactive';
        swalHelper.showToast(`Podcast status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update podcast status', 'error');
      }
    } catch (error: any) {
      console.error('Error updating podcast status:', error);
      swalHelper.showToast(error?.response?.data?.message || 'Failed to update podcast status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deletePodcast(podcastId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Podcast',
        'Are you sure you want to delete this podcast? This action cannot be undone.',
        'warning'
      );

      if (result.isConfirmed) {
        this.loading = true;
        try {
          const response = await this.podcastService.deletePodcast(podcastId);
          if (response && response.success && response.data !== false) {
            swalHelper.showToast('Podcast deleted successfully', 'success');
            this.fetchPodcasts();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete podcast', 'error');
          }
        } catch (error: any) {
          console.error('Error deleting podcast:', error);
          swalHelper.showToast(error?.response?.data?.message || 'Failed to delete podcast', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    return imagePath.startsWith('http') ? imagePath : this.imageurl + imagePath;
  }
}