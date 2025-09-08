import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplaintService } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { environment } from 'src/env/env.local';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import * as jspdf from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [ExportService, ComplaintService],
  templateUrl: './admin-complaint.component.html',
  styleUrls: ['./admin-complaint.component.scss']
})
export class AdminComplaintComponent implements OnInit, AfterViewInit {
  complaints: any = { docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 0 };
  loading: boolean = false;
  exporting: boolean = false;
  searchQuery: string = '';
  selectedComplaint: any = null;
  selectedStatus: string = 'all';
  complaintDetailsModal: any;
  updateStatusModal: any;
  imageurl = environment.imageUrl;
  pathurl = environment.baseURL;
  Math = Math;

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' }
  ];

  paginationConfig = {
    id: 'complaints-pagination'
  };

  updateForm = {
    status: ''
  };

  updateError = {
    status: ''
  };

  updateLoading: boolean = false;

  payload = {
    search: '',
    page: 1,
    limit: 10,
    status: 'all'
  };

  private searchSubject = new Subject<string>();

  constructor(
    private complaintService: ComplaintService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchComplaints();
    });
  }

  ngOnInit(): void {
    this.fetchComplaints();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const complaintModalElement = document.getElementById('complaintDetailsModal');
      if (complaintModalElement) {
        this.complaintDetailsModal = new bootstrap.Modal(complaintModalElement);
      } else {
        console.warn('Complaint modal element not found in the DOM');
      }

      const updateModalElement = document.getElementById('updateStatusModal');
      if (updateModalElement) {
        this.updateStatusModal = new bootstrap.Modal(updateModalElement);
      } else {
        console.warn('Update status modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchComplaints(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        status: this.payload.status,
        search: this.payload.search
      };
      console.log('Fetching complaints with request:', requestData); // Debug log
      
      const response = await this.complaintService.getComplaints(requestData);
      console.log('Complaint service response:', response); // Debug log
      
      if (response) {
        this.complaints = {
          docs: response.docs || [],
          totalDocs: response.totalDocs || 0,
          limit: response.limit || this.payload.limit,
          page: response.page || this.payload.page,
          totalPages: response.totalPages || 0,
          pagingCounter: response.pagingCounter || 1,
          hasPrevPage: response.hasPrevPage || false,
          hasNextPage: response.hasNextPage || false,
          prevPage: response.prevPage || null,
          nextPage: response.nextPage || null
        };
        this.cdr.markForCheck(); // Mark for check to ensure change detection
      } else {
        this.complaints = { docs: [], totalDocs: 0, limit: this.payload.limit, page: this.payload.page, totalPages: 0 };
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      swalHelper.showToast('Failed to fetch complaints', 'error');
      this.complaints = { docs: [], totalDocs: 0, limit: this.payload.limit, page: this.payload.page, totalPages: 0 };
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async updateComplaintStatusAPI(complaintId: string, status: string): Promise<any> {
    const response = await this.complaintService.updateComplaintStatus(complaintId, status);
    return response || { success: false, message: 'Failed to update status' };
  }

  async deleteComplaintAPI(complaintId: string): Promise<any> {
    const response = await this.complaintService.deleteComplaint(complaintId);
    return response || { success: false, message: 'Failed to delete complaint' };
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
    this.fetchComplaints();
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchComplaints();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchComplaints();
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return 'Unknown';
    }
  }

  viewComplaintDetails(complaint: any): void {
    this.selectedComplaint = complaint;

    if (this.complaintDetailsModal) {
      this.complaintDetailsModal.show();
    } else {
      try {
        const modalElement = document.getElementById('complaintDetailsModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.complaintDetailsModal = modalInstance;
          modalInstance.show();
        } else {
          $('#complaintDetailsModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#complaintDetailsModal').modal('show');
      }
    }
  }

  updateComplaintStatus(complaint: any): void {
    this.selectedComplaint = complaint;
    this.updateForm = {
      status: complaint.status || ''
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
    if (this.complaintDetailsModal) {
      this.complaintDetailsModal.hide();
    } else {
      $('#complaintDetailsModal').modal('hide');
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
      const response = await this.updateComplaintStatusAPI(this.selectedComplaint._id, this.updateForm.status);
      if (response.success) {
        swalHelper.showToast('Complaint status updated successfully', 'success');
        this.closeUpdateModal();
        this.fetchComplaints();
        if (this.selectedComplaint) {
          this.selectedComplaint.status = this.updateForm.status;
        }
      } else {
        swalHelper.showToast(response.message || 'Failed to update complaint status', 'error');
      }
    } catch (error) {
      console.error('Error updating complaint status:', error);
      swalHelper.showToast('Failed to update complaint status', 'error');
    } finally {
      this.updateLoading = false;
      this.cdr.detectChanges();
    }
  }

  async quickStatusUpdate(status: string): Promise<void> {
    try {
      this.updateLoading = true;
      const response = await this.updateComplaintStatusAPI(this.selectedComplaint._id, status);
      if (response.success) {
        swalHelper.showToast(`Complaint status updated to ${this.getStatusLabel(status)}`, 'success');
        this.selectedComplaint.status = status;
        this.fetchComplaints();
      } else {
        swalHelper.showToast(response.message || 'Failed to update complaint status', 'error');
      }
    } catch (error) {
      console.error('Error updating complaint status:', error);
      swalHelper.showToast('Failed to update complaint status', 'error');
    } finally {
      this.updateLoading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteComplaint(complaintId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Complaint',
        'Are you sure you want to delete this complaint? This action cannot be undone.',
        'warning'
      );

      if (result.isConfirmed) {
        this.loading = true;
        const response = await this.deleteComplaintAPI(complaintId);
        if (response.success) {
          swalHelper.showToast('Complaint deleted successfully', 'success');
          this.fetchComplaints();
        } else {
          swalHelper.showToast(response.message || 'Failed to delete complaint', 'error');
        }
      }
    } catch (error) {
      console.error('Error deleting complaint:', error);
      swalHelper.showToast('Failed to delete complaint', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}