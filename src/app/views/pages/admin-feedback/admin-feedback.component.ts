import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxPaginationModule } from 'ngx-pagination';
import { Subject, debounceTime } from 'rxjs';
import { swalHelper } from 'src/app/core/constants/swal-helper';
import { FeedbackService } from 'src/app/services/auth.service';
import { ExportService } from 'src/app/services/export.service';
import { environment } from 'src/env/env.local';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [FeedbackService, ExportService],
  templateUrl: './admin-feedback.component.html',
  styleUrl: './admin-feedback.component.scss'
})
export class AdminFeedbackComponent implements OnInit, AfterViewInit {
  feedbacks: any = { docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 0 };
  loading: boolean = false;
  exporting: boolean = false;
  searchQuery: string = '';
  selectedFeedback: any = null;
  selectedStatus: string = 'all';
  feedbackDetailsModal: any;
  updateStatusModal: any;
  createFeedbackModal: any;
  imageurl = environment.imageUrl;
  pathurl = environment.baseURL;
  Math = Math;

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Actioned', value: 'actioned' },
    { label: 'Archived', value: 'archived' }
  ];

  paginationConfig = {
    id: 'feedbacks-pagination'
  };

  updateForm = {
    status: ''
  };

  updateError = {
    status: ''
  };

  createForm = {
    userId: '',
    title: '',
    description: ''
  };

  createError = {
    userId: '',
    title: '',
    description: ''
  };

  updateLoading: boolean = false;
  createLoading: boolean = false;

  payload = {
    search: '',
    page: 1,
    limit: 10,
    status: 'all'
  };

  private searchSubject = new Subject<string>();

  constructor(
    private feedbackService: FeedbackService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchFeedbacks();
    });
  }

  ngOnInit(): void {
    this.fetchFeedbacks();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const feedbackModalElement = document.getElementById('feedbackDetailsModal');
      if (feedbackModalElement) {
        this.feedbackDetailsModal = new bootstrap.Modal(feedbackModalElement);
      } else {
        console.warn('Feedback modal element not found in the DOM');
      }

      const updateModalElement = document.getElementById('updateStatusModal');
      if (updateModalElement) {
        this.updateStatusModal = new bootstrap.Modal(updateModalElement);
      } else {
        console.warn('Update status modal element not found in the DOM');
      }

      const createModalElement = document.getElementById('createFeedbackModal');
      if (createModalElement) {
        this.createFeedbackModal = new bootstrap.Modal(createModalElement);
      } else {
        console.warn('Create feedback modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchFeedbacks(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        status: this.payload.status,
        search: this.payload.search
      };
      console.log('Fetching feedbacks with request:', requestData);

      const response = await this.feedbackService.getFeedbacks(requestData);
      console.log('Feedback service response:', response);

      this.feedbacks = {
        docs: response?.docs || [],
        totalDocs: response?.totalDocs || 0,
        limit: response?.limit || this.payload.limit,
        page: response?.page || this.payload.page,
        totalPages: response?.totalPages || 0,
        pagingCounter: response?.pagingCounter || 1,
        hasPrevPage: response?.hasPrevPage || false,
        hasNextPage: response?.hasNextPage || false,
        prevPage: response?.prevPage || null,
        nextPage: response?.nextPage || null
      };
      console.log('Assigned feedbacks:', this.feedbacks);

      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error fetching feedbacks:', error.message || error);
      swalHelper.showToast(error.message || 'Failed to fetch feedbacks', 'error');
      this.feedbacks = { docs: [], totalDocs: 0, limit: this.payload.limit, page: this.payload.page, totalPages: 0 };
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async createFeedback(): Promise<void> {
    if (!this.validateCreateForm()) {
      return;
    }

    this.createLoading = true;
    try {
      const response = await this.feedbackService.createFeedback(this.createForm);
      if (response.success) {
        swalHelper.showToast('Feedback created successfully', 'success');
        this.closeCreateModal();
        this.resetCreateForm();
        this.fetchFeedbacks();
      } else {
        swalHelper.showToast(response.message || 'Failed to create feedback', 'error');
      }
    } catch (error: any) {
      console.error('Error creating feedback:', error.message || error);
      swalHelper.showToast(error.message || 'Failed to create feedback', 'error');
    } finally {
      this.createLoading = false;
      this.cdr.detectChanges();
    }
  }

  validateCreateForm(): boolean {
    let isValid = true;
    this.createError = { userId: '', title: '', description: '' };

    if (!this.createForm.userId) {
      this.createError.userId = 'User ID is required';
      isValid = false;
    }
    if (!this.createForm.title) {
      this.createError.title = 'Title is required';
      isValid = false;
    }
    if (!this.createForm.description) {
      this.createError.description = 'Description is required';
      isValid = false;
    }

    return isValid;
  }

  resetCreateForm(): void {
    this.createForm = { userId: '', title: '', description: '' };
    this.createError = { userId: '', title: '', description: '' };
  }

  openCreateModal(): void {
    if (this.createFeedbackModal) {
      this.createFeedbackModal.show();
    } else {
      try {
        const modalElement = document.getElementById('createFeedbackModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.createFeedbackModal = modalInstance;
          modalInstance.show();
        } else {
          $('#createFeedbackModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing create modal:', error);
        $('#createFeedbackModal').modal('show');
      }
    }
  }

  closeCreateModal(): void {
    if (this.createFeedbackModal) {
      this.createFeedbackModal.hide();
    } else {
      $('#createFeedbackModal').modal('hide');
    }
  }

  async updateFeedbackStatusAPI(feedbackId: string, status: string): Promise<any> {
    const response = await this.feedbackService.updateFeedbackStatus(feedbackId, status);
    return response || { success: false, message: 'Failed to update status' };
  }

  async deleteFeedbackAPI(feedbackId: string): Promise<any> {
    const response = await this.feedbackService.deleteFeedback(feedbackId);
    return response || { success: false, message: 'Failed to delete feedback' };
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onStatusChange(): void {
    this.payload.page = 1;
    this.payload.status = this.selectedStatus || 'all';
    this.payload.search = '';
    this.searchQuery = '';
    this.fetchFeedbacks();
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchFeedbacks();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchFeedbacks();
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'reviewed': return 'Reviewed';
      case 'actioned': return 'Actioned';
      case 'archived': return 'Archived';
      default: return 'Unknown';
    }
  }

  viewFeedbackDetails(feedback: any): void {
    this.selectedFeedback = feedback;

    if (this.feedbackDetailsModal) {
      this.feedbackDetailsModal.show();
    } else {
      try {
        const modalElement = document.getElementById('feedbackDetailsModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.feedbackDetailsModal = modalInstance;
          modalInstance.show();
        } else {
          $('#feedbackDetailsModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#feedbackDetailsModal').modal('show');
      }
    }
  }

  updateFeedbackStatus(feedback: any): void {
    this.selectedFeedback = feedback;
    this.updateForm = {
      status: feedback.status || ''
    };
    this.updateError = {
      status: ''
    };

    if (this.updateStatusModal) {
      this.updateStatusModal.show();
    } else {
      try {
        const modalElement = document.getElementById('updateStatusModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.updateStatusModal = modalInstance;
          modalInstance.show();
        } else {
          $('#updateStatusModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing update modal:', error);
        $('#updateStatusModal').modal('show');
      }
    }
  }

  closeModal(): void {
    if (this.feedbackDetailsModal) {
      this.feedbackDetailsModal.hide();
    } else {
      $('#feedbackDetailsModal').modal('hide');
    }
  }

  closeUpdateModal(): void {
    if (this.updateStatusModal) {
      this.updateStatusModal.hide();
    } else {
      $('#updateStatusModal').modal('hide');
    }
  }

  validateUpdateForm(): boolean {
    let isValid = true;
    this.updateError = { status: '' };

    if (!this.updateForm.status) {
      this.updateError.status = 'Status is required';
      isValid = false;
    }

    return isValid;
  }

  async submitStatusUpdate(): Promise<void> {
    if (!this.validateUpdateForm()) {
      return;
    }

    this.updateLoading = true;
    try {
      const response = await this.updateFeedbackStatusAPI(this.selectedFeedback._id, this.updateForm.status);
      if (response.success) {
        swalHelper.showToast('Feedback status updated successfully', 'success');
        this.closeUpdateModal();
        this.fetchFeedbacks();
        if (this.selectedFeedback) {
          this.selectedFeedback.status = this.updateForm.status;
        }
      } else {
        swalHelper.showToast(response.message || 'Failed to update feedback status', 'error');
      }
    } catch (error: any) {
      console.error('Error updating feedback status:', error.message || error);
      swalHelper.showToast(error.message || 'Failed to update feedback status', 'error');
    } finally {
      this.updateLoading = false;
      this.cdr.detectChanges();
    }
  }

  async quickStatusUpdate(status: string): Promise<void> {
    try {
      this.updateLoading = true;
      const response = await this.updateFeedbackStatusAPI(this.selectedFeedback._id, status);
      if (response.success) {
        swalHelper.showToast(`Feedback status updated to ${this.getStatusLabel(status)}`, 'success');
        this.selectedFeedback.status = status;
        this.fetchFeedbacks();
      } else {
        swalHelper.showToast(response.message || 'Failed to update feedback status', 'error');
      }
    } catch (error: any) {
      console.error('Error updating feedback status:', error.message || error);
      swalHelper.showToast(error.message || 'Failed to update feedback status', 'error');
    } finally {
      this.updateLoading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Feedback',
        'Are you sure you want to delete this feedback? This action cannot be undone.',
        'warning'
      );

      if (result.isConfirmed) {
        this.loading = true;
        const response = await this.deleteFeedbackAPI(feedbackId);
        if (response.success) {
          swalHelper.showToast('Feedback deleted successfully', 'success');
          this.fetchFeedbacks();
        } else {
          swalHelper.showToast(response.message || 'Failed to delete feedback', 'error');
        }
      }
    } catch (error: any) {
      console.error('Error deleting feedback:', error.message || error);
      swalHelper.showToast(error.message || 'Failed to delete feedback', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}