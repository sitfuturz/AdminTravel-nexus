import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PodcastService, Podcast } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { environment } from 'src/env/env.local';



declare var $: any;
declare var bootstrap: any;

export interface User {
  _id: string;
  name: string;
  chapter_name: string;
  mobile_number: string;
  profilePic: string;
}

export interface Slot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  status: string;
  isFull: boolean;
  id: string;
}

export interface Booking {
  _id: string;
  slotId: Slot;
  userId: User;
  status: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface BookingResponse {
  docs: Booking[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [PodcastService],
  templateUrl: './podcastBooking.component.html',
  styleUrls: ['./podcastBooking.component.css'],
})
export class BookingsComponent implements OnInit, AfterViewInit {
  bookings: BookingResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null
  };

  podcasts: Podcast[] = [];
  selectedPodcastId: string = '';
  loading: boolean = false;
  loadingPodcasts: boolean = false;

  searchQuery: string = '';
  bookingModal: any;
  selectedBooking: Booking | null = null;
  
  bookingUpdate = {
    bookingId: '',
    action: 'pending' as 'pending' | 'accepted' | 'rejected' | 'cancelled',
    adminNotes: ''
  };

  statusOptions = [
    { value: 'pending', label: 'Pending', class: 'bg-warning' },
    { value: 'accepted', label: 'Accepted', class: 'bg-success' },
    { value: 'rejected', label: 'Rejected', class: 'bg-danger' },
    { value: 'cancelled', label: 'Cancelled', class: 'bg-secondary' }
  ];
  
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
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchBookings();
    });
  }

  imageurl = environment.imageUrl;



  ngOnInit(): void {
    this.fetchPodcasts();
    console.log('imageurl', this.imageurl);

  }
  

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('bookingModal');
      if (modalElement) {
        this.bookingModal = new bootstrap.Modal(modalElement);
      }
    }, 300);
  }

  async fetchPodcasts(): Promise<void> {
    this.loadingPodcasts = true;
    try {
      const response = await this.podcastService.getPodcasts({
        page: 1,
        limit: 100,
        search: ''
      });
      
      if (response && response.data && response.data.podcasts) {
        this.podcasts = response.data.podcasts;
      }
    } catch (error) {
      console.error('Error fetching podcasts:', error);
      swalHelper.showToast('Failed to fetch podcasts', 'error');
    } finally {
      this.loadingPodcasts = false;
    }
  }

  async fetchBookings(): Promise<void> {
    if (!this.selectedPodcastId) {
      this.bookings.docs = [];
      return;
    }

    this.loading = true;
    try {
      const response = await this.podcastService.getBookingsByPodcastId(
        this.selectedPodcastId,
        this.payload.page,
        this.payload.limit,
        this.payload.search
      );
      
      if (response && response.data) {
        this.bookings = response.data;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching bookings:', error);
      swalHelper.showToast('Failed to fetch bookings', 'error');
    } finally {
      this.loading = false;
    }
  }

  onPodcastChange(): void {
    this.payload.page = 1;
    this.fetchBookings();
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }
  
  onChange(): void {
    this.payload.page = 1;
    this.fetchBookings();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchBookings();
  }

  openStatusUpdateModal(booking: Booking): void {
    this.selectedBooking = booking;
    this.bookingUpdate = {
      bookingId: booking._id,
      action: booking.status as any,
      adminNotes: booking.adminNotes || ''
    };
    
    this.showModal();
  }
  
  showModal(): void {
    this.cdr.detectChanges();
    
    if (this.bookingModal) {
      this.bookingModal.show();
    } else {
      try {
        const modalElement = document.getElementById('bookingModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.bookingModal = modalInstance;
          modalInstance.show();
        } else {
          $('#bookingModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#bookingModal').modal('show');
      }
    }
  }
  
  closeModal(): void {
    if (this.bookingModal) {
      this.bookingModal.hide();
    } else {
      $('#bookingModal').modal('hide');
    }
  }

  async updateBookingStatus(): Promise<void> {
    try {
      if (!this.bookingUpdate.bookingId || !this.bookingUpdate.action) {
        swalHelper.showToast('Please fill all required fields', 'warning');
        return;
      }

      this.loading = true;

      const response = await this.podcastService.updateBookingStatus({
        bookingId: this.bookingUpdate.bookingId,
        action: this.bookingUpdate.action,
        adminNotes: this.bookingUpdate.adminNotes
      });

      if (response && response.success) {
        swalHelper.showToast('Booking status updated successfully', 'success');
        this.closeModal();
        this.fetchBookings();
      } else {
        swalHelper.showToast(response?.message || 'Failed to update booking status', 'error');
      }
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      swalHelper.showToast(error?.error.message || 'Failed to update booking status', 'info');
    } finally {
      this.loading = false;
    }
  }

  getStatusBadgeClass(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.class : 'bg-secondary';
  }

  getSelectedPodcastName(): string {
    const podcast = this.podcasts.find(p => p._id === this.selectedPodcastId);
    return podcast ? podcast.podcasterName : 'Select Podcaster';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(timeString: string): string {
    if (!timeString) return 'N/A';
    return timeString;
  }
}