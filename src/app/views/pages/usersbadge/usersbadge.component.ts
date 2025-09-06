declare var bootstrap: any;
declare var $: any;

import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { BadgeService, ChapterService, Badge, BadgeResponse, BadgeUserResponse, Chapter } from '../../../services/auth.service';
import { environment } from 'src/env/env.local';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-badge-management',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [BadgeService, ChapterService],
  templateUrl: './usersbadge.component.html',
  styleUrls: ['./usersbadge.component.css']
})
export class BadgeManagementComponent implements OnInit, AfterViewInit {
  chapters: Chapter[] = [];
  badgeUsers: BadgeUserResponse = {
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
  availableBadges: Badge[] = [];
  selectedUser: any = null;
  selectedBadgeId: string | null = null;
  selectedBadgeForPreview: any = null;
  loading: boolean = false;
  chaptersLoading: boolean = false;
  badgesLoading: boolean = false;
  assigning: { [key: string]: boolean } = {};
  Math = Math;
  private filterSubject = new Subject<void>();
  private badgeModal: any = null;
  private imagePreviewModal: any = null;

  filters = {
    page: 1,
    limit: 10,
    search: '',
    chapter_name: null,
    badge_name: null
  };

  paginationConfig = {
    id: 'badge-management-pagination'
  };

  constructor(
    private badgeService: BadgeService,
    private chapterService: ChapterService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchBadgeUsers();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchBadgeUsers();
    this.fetchAvailableBadges();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const badgeModalElement = document.getElementById('badgeModal');
      if (badgeModalElement) {
        this.badgeModal = new bootstrap.Modal(badgeModalElement);
      }

      const imagePreviewModalElement = document.getElementById('imagePreviewModal');
      if (imagePreviewModalElement) {
        this.imagePreviewModal = new bootstrap.Modal(imagePreviewModalElement);
      }
    }, 300);
  }

  async fetchChapters(): Promise<void> {
    this.chaptersLoading = true;
    try {
      const response = await this.chapterService.getAllChapters({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.chapters = response.docs || [];
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    } finally {
      this.chaptersLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchBadgeUsers(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.badgeService.getAllBadgesUsers(this.filters);
      this.badgeUsers = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching badge users:', error);
      swalHelper.showToast('Failed to fetch badge users', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchAvailableBadges(): Promise<void> {
    this.badgesLoading = true;
    try {
      const response = await this.badgeService.getAllBadges({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.availableBadges = response.data?.docs || response.docs || [];
      console.log('Fetched badges:', this.availableBadges); // Debug log
    } catch (error) {
      console.error('Error fetching badges:', error);
      swalHelper.showToast('Failed to fetch badges', 'error');
    } finally {
      this.badgesLoading = false;
      this.cdr.detectChanges();
    }
  }

  async assignBadge(): Promise<void> {
    if (!this.selectedUser || !this.selectedBadgeId) return;

    this.assigning[this.selectedUser._id] = true;
    try {
      const response = await this.badgeService.assignBadge({
        userId: this.selectedUser._id,
        badgeId: this.selectedBadgeId
      });
      if (response.success) {
        swalHelper.showToast(response.message, 'success');
        await this.fetchBadgeUsers();
        this.selectedUser.badges = response.data?.badges || [];
        this.selectedBadgeId = null;
      } else {
        swalHelper.showToast(response.message, 'error');
      }
    } catch (error) {
      console.error('Error assigning badge:', error);
      swalHelper.showToast('Failed to assign badge', 'error');
    } finally {
      this.assigning[this.selectedUser._id] = false;
      this.cdr.detectChanges();
    }
  }

  async assignBadgeToUser(user: any, badgeId: string): Promise<void> {
    if (!user || !badgeId) return;

    this.assigning[user._id] = true;
    try {
      const response = await this.badgeService.assignBadge({
        userId: user._id,
        badgeId
      });
      if (response.success) {
        swalHelper.showToast(response.message, 'success');
        await this.fetchBadgeUsers();
      } else {
        swalHelper.showToast(response.message, 'error');
      }
    } catch (error) {
      console.error('Error assigning badge:', error);
      swalHelper.showToast('Failed to assign badge', 'error');
    } finally {
      this.assigning[user._id] = false;
      this.cdr.detectChanges();
    }
  }

  async unassignBadge(badgeId: string): Promise<void> {
    if (!this.selectedUser) return;

    this.assigning[this.selectedUser._id] = true;
    try {
      const response = await this.badgeService.unassignBadge({
        userId: this.selectedUser._id,
        badgeId
      });
      if (response.success) {
        swalHelper.showToast(response.message, 'success');
        await this.fetchBadgeUsers();
        this.selectedUser.badges = this.selectedUser.badges.filter((b: any) => b.badgeId !== badgeId);
      } else {
        swalHelper.showToast(response.message, 'error');
      }
    } catch (error) {
      console.error('Error unassigning badge:', error);
      swalHelper.showToast('Failed to unassign badge', 'error');
    } finally {
      this.assigning[this.selectedUser._id] = false;
      this.cdr.detectChanges();
    }
  }

  openBadgeModal(user: any): void {
    this.selectedUser = { ...user };
    this.selectedBadgeId = null;
    this.fetchAvailableBadges();
    this.showBadgeModal();
  }

  openImagePreview(badge: any): void {
    this.selectedBadgeForPreview = badge;
    this.showImagePreviewModal();
  }

  showBadgeModal(): void {
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
        console.error('Error showing badge modal:', error);
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

  closeImagePreviewModal(): void {
    if (this.imagePreviewModal) {
      this.imagePreviewModal.hide();
    } else {
      $('#imagePreviewModal').modal('hide');
    }
  }

  getBadgeImageUrl(badge: any): string {
    if (badge?.image) {
      return `${environment.imageUrl}${badge.image}`;
    }
    const availableBadge = this.availableBadges.find(b => b._id === badge?.badgeId);
    return availableBadge?.image ? `${environment.imageUrl}${availableBadge.image}` : '';
  }

  onChapterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      search: '',
      chapter_name: null,
      badge_name: null
    };
    this.fetchBadgeUsers();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.fetchBadgeUsers();
  }
}