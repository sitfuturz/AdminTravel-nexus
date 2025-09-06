import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/env/env.local';
import { BadgeService, Badge, BadgeResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
declare var bootstrap: any;
declare var $: any;

@Component({
  selector: 'app-badges',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [BadgeService],
  templateUrl: './badges.component.html',
  styleUrls: ['./badges.component.css'],
})
export class BadgesComponent implements OnInit, AfterViewInit {
  badges: BadgeResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null
  };
  
  loading: boolean = false;
  searchQuery: string = '';
  selectedBadge: Badge | null = null;
  selectedBadgeForPreview: Badge | null = null;
  badgeModal: any;
  imagePreviewModal: any;
  editMode: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageurl = environment.imageUrl;
  formSubmitted: boolean = false;
  
  newBadge = {
    name: '',
    description: '',
    image: null as File | null,
    isActive: true
  };
  
  private searchSubject = new Subject<string>();
  
  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  constructor(
    private badgeService: BadgeService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchBadges();
    });
  }

  ngOnInit(): void {
    this.fetchBadges();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('badgeModal');
      if (modalElement) {
        this.badgeModal = new bootstrap.Modal(modalElement);
      }
      
      const imagePreviewModalElement = document.getElementById('imagePreviewModal');
      if (imagePreviewModalElement) {
        this.imagePreviewModal = new bootstrap.Modal(imagePreviewModalElement);
      }
      this.cdr.detectChanges();
    }, 300);
  }

  async fetchBadges(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      const response = await this.badgeService.getAllBadges(requestData);
      this.badges = response.data || response;
      // Validate and normalize badges response
      if (!this.badges.docs || !Array.isArray(this.badges.docs)) {
        this.badges.docs = [];
      }
      if (!this.badges.totalDocs || isNaN(this.badges.totalDocs)) {
        this.badges.totalDocs = 0;
      }
      if (!this.badges.totalPages || isNaN(this.badges.totalPages)) {
        this.badges.totalPages = 1;
      }
      if (!this.badges.page || isNaN(this.badges.page)) {
        this.badges.page = 1;
      }
      // Synchronize payload.page with backend response
      this.payload.page = this.badges.page;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching badges:', error);
      swalHelper.showToast('Failed to fetch badges', 'error');
      this.badges = {
        docs: [],
        totalDocs: 0,
        limit: this.payload.limit,
        page: this.payload.page,
        totalPages: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null
      };
      this.payload.page = 1;
      this.cdr.detectChanges();
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
    this.fetchBadges();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchBadges();
    }
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
      this.newBadge.image = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  openAddBadgeModal(): void {
    this.editMode = false;
    this.resetForm();
    this.showModal();
  }

  openEditBadgeModal(badge: Badge): void {
    this.editMode = true;
    this.selectedBadge = badge;
    this.newBadge = {
      name: badge.name,
      description: badge.description,
      image: null,
      isActive: badge.isActive
    };
    
    if (badge.image) {
      this.imagePreview = this.getImageUrl(badge.image);
    } else {
      this.imagePreview = null;
    }
    
    this.showModal();
  }

  openImagePreview(badge: Badge): void {
    this.selectedBadgeForPreview = badge;
    this.showImagePreviewModal();
  }

  resetForm(): void {
    this.newBadge = {
      name: '',
      description: '',
      image: null,
      isActive: true
    };
    this.selectedFile = null;
    this.imagePreview = null;
    this.formSubmitted = false;
  }
  
  showModal(): void {
    this.cdr.detectChanges();
    
    if (this.badgeModal) {
      this.badgeModal.show();
    } else {
      try {
        const modalElement = document.getElementById('badgeModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.badgeModal = modalInstance;
          modalInstance.show();
        } else {
          $('#badgeModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#badgeModal').modal('show');
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
    if (this.badgeModal) {
      this.badgeModal.hide();
    } else {
      $('#badgeModal').modal('hide');
    }
  }

  async saveBadge(form: any): Promise<void> {
    this.formSubmitted = true;
    
    try {
      if (!this.newBadge.name?.trim()) {
        swalHelper.showToast('Please enter a badge name', 'warning');
        return;
      }

      if (!this.editMode && !this.newBadge.image) {
        swalHelper.showToast('Please select a badge image', 'warning');
        return;
      }

      this.loading = true;

      const formData = new FormData();
      formData.append('name', this.newBadge.name.trim());
      formData.append('description', this.newBadge.description?.trim() || '');
      formData.append('isActive', this.newBadge.isActive.toString());

      if (this.newBadge.image) {
        formData.append('image', this.newBadge.image);
      }

      const response = this.editMode && this.selectedBadge
        ? await this.badgeService.updateBadge(this.selectedBadge._id, formData)
        : await this.badgeService.createBadge(formData);

      if (response && response.success) {
        swalHelper.showToast(`Badge ${this.editMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeModal();
        this.fetchBadges();
      } else {
        swalHelper.showToast(response?.message || `Failed to ${this.editMode ? 'update' : 'create'} badge`, 'error');
      }
    } catch (error: any) {
      console.error('Error saving badge:', error);
      swalHelper.showToast(error?.response?.data?.message || error?.message || 'Failed to save badge', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleBadgeStatus(badge: Badge): Promise<void> {
    try {
      this.loading = true;
      
      const updatedStatus = !badge.isActive;
      
      const formData = new FormData();
      formData.append('name', badge.name);
      formData.append('description', badge.description || '');
      formData.append('isActive', updatedStatus.toString());
      
      const response = await this.badgeService.updateBadge(badge._id, formData);
      
      if (response && response.success) {
        badge.isActive = updatedStatus;
        swalHelper.showToast(`Badge status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update badge status', 'error');
      }
    } catch (error) {
      console.error('Error updating badge status:', error);
      swalHelper.showToast('Failed to update badge status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteBadge(badgeId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Badge',
        'Are you sure you want to delete this badge? This action cannot be undone.',
        'warning'
      );
      
      if (result.isConfirmed) {
        this.loading = true;
        
        try {
          const response = await this.badgeService.deleteBadge(badgeId);
          
          if (response && response.success) {
            swalHelper.showToast('Badge deleted successfully', 'success');
            this.fetchBadges();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete badge', 'error');
          }
        } catch (error) {
          console.error('Error deleting badge:', error);
          swalHelper.showToast('Failed to delete badge', 'error');
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

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    const baseUrl = this.imageurl;
    return imagePath.startsWith('http') ? imagePath : baseUrl + imagePath;
  }
}