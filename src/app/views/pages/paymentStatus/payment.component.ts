import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/env/env.local';
import { EventService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';

declare var bootstrap: any;

@Component({
  selector: 'app-event-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule],
  providers: [EventService],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
})
export class EventPaymentsComponent implements OnInit, AfterViewInit {
  events: any = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
    pagingCounter: 1
  };
  loading: boolean = false;
  searchQuery: string = '';
  selectedEvent: any | null = null;
  registrations: any = null;
  registrationsLoading: boolean = false;
  registrationsPage: number = 1;
  registrationsLimit: number = 10;
  viewRegistrationsModal: any;

  private searchSubject = new Subject<string>();

  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  Math = Math;

  constructor(
    private eventService: EventService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchEvents();
    });
  }

  ngOnInit(): void {
    this.fetchEvents();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const viewRegistrationsModalElement = document.getElementById('viewRegistrationsModal');
      if (viewRegistrationsModalElement) {
        this.viewRegistrationsModal = new bootstrap.Modal(viewRegistrationsModalElement);
      }
    }, 300);
  }

  async fetchEvents(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      const response = await this.eventService.newGetEvents(requestData);
      console.log('API Response:', response);
      this.events = {
        docs: response.data?.events || [],
        totalDocs: response.data?.total || 0,
        limit: response.data?.limit || this.payload.limit,
        page: response.data?.page || this.payload.page,
        totalPages: response.data?.totalPages || 1,
        hasPrevPage: response.data?.hasPrevPage || false,
        hasNextPage: response.data?.hasNextPage || false,
        prevPage: response.data?.prevPage || null,
        nextPage: response.data?.nextPage || null,
        pagingCounter: response.data?.pagingCounter || 1
      };
      console.log('Mapped Events:', this.events);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching events:', error);
      swalHelper.showToast('Failed to fetch events', 'error');
      this.events = {
        docs: [],
        totalDocs: 0,
        limit: this.payload.limit,
        page: this.payload.page,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
        pagingCounter: 1
      };
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.events.totalPages) {
      this.payload.page = page;
      this.fetchEvents();
    }
  }

  openViewRegistrationsModal(event: any): void {
    this.selectedEvent = event;
    this.registrationsPage = 1;
    this.fetchRegistrations();
    this.showViewRegistrationsModal();
  }

  async fetchRegistrations(): Promise<void> {
    if (!this.selectedEvent) return;

    this.registrationsLoading = true;
    try {
      const response = await this.eventService.getRegistrationsByEventId(
        this.selectedEvent._id,
        this.registrationsPage,
        this.registrationsLimit
      );
      this.registrations = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching registrations:', error);
      swalHelper.showToast('Failed to fetch registrations', 'error');
    } finally {
      this.registrationsLoading = false;
    }
  }

  changeRegistrationsPage(page: number): void {
    if (page >= 1 && page <= (this.registrations?.data.totalPages || 1)) {
      this.registrationsPage = page;
      this.fetchRegistrations();
    }
  }

  async updateStatus(registration: any, newStatus: string): Promise<void> {
    if (registration.status === newStatus) return;

    const result = await swalHelper.confirmation(
      'Update Payment Status',
      `Are you sure you want to change the status to "${newStatus}"?`,
      'warning'
    );

    if (result.isConfirmed) {
      this.registrationsLoading = true;
      try {
        const response = await this.eventService.updatePaymentStatus(registration._id, newStatus);
        if (response.success) {
          swalHelper.showToast('Payment status updated successfully', 'success');
          this.fetchRegistrations();
        } else {
          swalHelper.showToast(response.message || 'Failed to update status', 'error');
        }
      } catch (error: any) {
        console.error('Error updating status:', error);
        swalHelper.showToast(error?.response?.data?.message || 'Failed to update status', 'error');
      } finally {
        this.registrationsLoading = false;
      }
    }
  }

  showViewRegistrationsModal(): void {
    this.cdr.detectChanges();
    if (this.viewRegistrationsModal) {
      this.viewRegistrationsModal.show();
    }
  }

  closeViewRegistrationsModal(): void {
    if (this.viewRegistrationsModal) {
      this.viewRegistrationsModal.hide();
    }
    this.selectedEvent = null;
    this.registrations = null;
  }

  getUserName(user: any | null): string {
    return user ? user.name : 'Guest (Null User)';
  }

  getUserEmail(user: any | null): string {
    return user ? user.email : 'N/A';
  }

  getPaymentDate(reg: any): string {
    return reg.data?.data?.paymentDate || reg.createdAt || 'N/A';
  }

  getTransactionId(reg: any): string {
    return reg.data?.transactionId || reg.transactionId || 'N/A';
  }

  getScreenshotUrl(reg: any): string {
    return reg.paymentScreenshotUrl ? `${environment.imageUrl}${reg.paymentScreenshotUrl}` : '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}